<script lang="ts">
  import { goto, onNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import { setContext, untrack } from "svelte";
  import {
    connectRouterStackBridge,
    type ConnectStackBridgeOptions,
    createPageLayout,
    createRouterStack,
    createRouterStackActions,
    KEEP_ALIVE_LIMIT,
    prefersReducedMotion,
    type RouterLocation,
    type StackPageLayout,
    STACK_TRANSITION_MS,
    watchReducedMotion,
  } from "../core.js";
  import StackPage from "../svelte/StackPage.svelte";
  import { STACK_KEY, type SvelteKitStack } from "./context.js";
  import FrozenPage from "./FrozenPage.svelte";
  import { readHistoryIndex, toPageComponents } from "./navigation.js";
  import { stackStyleTag } from "./style-tag.js";
  import type { StackLayoutProps, StackPageSnapshot } from "./types.js";

  /**
   * SvelteKit 위에 스택 전환을 얹는다. URL·history·load(SSR 포함)는 SvelteKit 이 맡고,
   * 이 컴포넌트는 이동마다 `page` 값을 history 항목별로 고정해 페이지를 쌓아 그린다.
   * SvelteKit 은 지금 페이지의 children 만 그리므로, 페이지 컴포넌트는 `pages`(import.meta.glob)에서 찾아 직접 마운트한다.
   * `keepAliveLimit` 은 마운트 시 1회만 읽는다
   */
  let {
    pages: pageModules,
    children,
    transition = "slide",
    duration = STACK_TRANSITION_MS,
    popStateTransition = "animate",
    maxWidth = "600px",
    maxMountedPages,
    safeArea = false,
    keepAlive,
    keepAliveLimit = KEEP_ALIVE_LIMIT,
    onBackAtRoot,
    bridge = false,
  }: StackLayoutProps = $props();

  // SSR 과 첫 렌더를 맞추려고 마운트 뒤에 읽는다
  let reducedMotion = $state(false);
  const effectiveDuration = $derived(
    transition === "none" || reducedMotion ? 0 : duration
  );
  const stackOptions = () => ({
    duration: effectiveDuration,
    popStateTransition,
    keepAliveLimit: untrack(() => keepAliveLimit),
  });

  const capture = (): StackPageSnapshot => ({
    url: page.url,
    params: page.params,
    route: page.route,
    data: page.data,
    form: page.form,
    status: page.status,
    error: page.error,
    state: page.state,
  });
  const pathOf = (url: URL) => url.pathname + url.search;

  // location key 는 history 항목마다 새로 만든다 (SvelteKit 의 위치 index 는 push 뒤 재사용된다)
  let keySeq = 0;
  const nextKey = () => `wvk-${keySeq++}`;
  const keyByIndex = new Map<number, string>();

  const initialPath = pathOf(page.url);
  const initialKey = nextKey();
  let currentKey = $state(initialKey);
  let currentIndex = readHistoryIndex();
  if (currentIndex !== undefined) keyByIndex.set(currentIndex, initialKey);

  const stack = untrack(() =>
    createRouterStack(
      {
        key: initialKey,
        path: initialPath,
        index: currentIndex,
        keepAlive: keepAlive?.(initialPath),
      },
      stackOptions()
    )
  );
  $effect.pre(() => stack.setOptions(stackOptions()));

  let stackState = $state.raw(stack.getState());
  const unsubscribe = stack.subscribe(() => {
    stackState = stack.getState();
  });
  $effect(() => () => {
    unsubscribe();
    stack.dispose();
  });

  // 엔트리 key → 그 페이지의 page 값. 지금 location 의 엔트리만 갱신하고 나머지는 들어올 때 값 그대로 둔다
  let snapshots = $state.raw<Record<string, StackPageSnapshot>>(
    untrack(() => ({ [initialKey]: capture() }))
  );

  /** history 는 page 갱신 전에 바뀌므로 onNavigate 에서 이동 종류·위치를 정해 두고, page 가 바뀔 때 반영한다 */
  let pending: Omit<RouterLocation, "path"> | null = null;
  onNavigate((navigation) => {
    const index = readHistoryIndex();
    if (navigation.type === "popstate") {
      const known = index === undefined ? undefined : keyByIndex.get(index);
      pending = { key: known ?? nextKey(), action: "pop", index };
    } else {
      const replace = index !== undefined && index === currentIndex;
      pending = { key: nextKey(), action: replace ? "replace" : "push", index };
    }
    if (pending.index !== undefined) keyByIndex.set(pending.index, pending.key);
  });

  const commit = (snapshot: StackPageSnapshot) => {
    const location = pending;
    pending = null;
    if (location) {
      const path = pathOf(snapshot.url);
      currentKey = location.key;
      stack.sync({ ...location, path, keepAlive: keepAlive?.(path) });
    } else {
      // 해시·shallow(pushState) 이동은 같은 페이지로 본다
      const index = readHistoryIndex();
      if (index !== undefined && !keyByIndex.has(index)) {
        keyByIndex.set(index, currentKey);
      }
    }
    currentIndex = location ? location.index : readHistoryIndex();
    snapshots = { ...snapshots, [stack.entryKeyFor(currentKey)]: snapshot };
  };

  $effect.pre(() => {
    const snapshot = capture();
    untrack(() => commit(snapshot));
  });

  const actionOptions = {
    get onBackAtRoot() {
      return onBackAtRoot;
    },
  };
  const actions = createRouterStackActions(
    stack,
    {
      navigate: (path, options) =>
        void goto(path, { replaceState: options?.replace }),
      go: (delta) => window.history.go(delta),
    },
    actionOptions
  );
  const context: SvelteKitStack = {
    get depth() {
      return stackState.entries.length;
    },
    get canGoBack() {
      return stackState.entries.length > 1;
    },
    get isTransitioning() {
      return stackState.transition !== null;
    },
    ...actions,
  };
  setContext(STACK_KEY, context);

  const bridgeOptions: ConnectStackBridgeOptions = {
    get allowUrl() {
      return typeof bridge === "object" ? bridge.allowUrl : undefined;
    },
    get onError() {
      return typeof bridge === "object" ? bridge.onError : undefined;
    },
    get emitStackChanged() {
      return typeof bridge === "object" ? bridge.emitStackChanged : undefined;
    },
    get onBackAtRoot() {
      return onBackAtRoot;
    },
  };
  $effect(() => {
    if (!bridge) return;
    return untrack(() => connectRouterStackBridge(stack, actions, bridgeOptions));
  });

  $effect(() => {
    reducedMotion = prefersReducedMotion();
    return watchReducedMotion((reduced) => {
      reducedMotion = reduced;
    });
  });

  const components = $derived(toPageComponents(pageModules));
  const componentFor = (snapshot: StackPageSnapshot) =>
    snapshot.error || !snapshot.route.id
      ? undefined
      : components.get(snapshot.route.id);

  // 전환 콜백은 들어오는 페이지만 부른다. 조건을 prop 값으로 넘기면 컴파일러가 derived 로 감싸
  // 이미 제거된 퇴장 페이지의 animationend 에서 derived_inert 경고가 나므로 호출 시점에 확인한다
  const whenEntering = (item: StackPageLayout, action: () => void) => {
    if (item.pageState === "enter") action();
  };

  const layout = createPageLayout();
  const layoutPages = $derived(layout(stackState, { maxMountedPages }));
  const direction = $derived(stackState.transition?.type ?? "push");
  const currentEntryKey = $derived(stack.entryKeyFor(currentKey));

  // 스택에서 빠진 페이지의 page 값은 버린다
  $effect(() => {
    const alive = new Set(layoutPages.map((item) => item.entry.key));
    alive.add(currentEntryKey);
    untrack(() => {
      const keys = Object.keys(snapshots);
      if (keys.every((key) => alive.has(key))) return;
      snapshots = Object.fromEntries(
        keys.filter((key) => alive.has(key)).map((key) => [key, snapshots[key]])
      );
    });
  });

</script>

<div class="wvk-root" data-safe-area={safeArea ? "" : undefined}>
  {@html stackStyleTag}
  <div class="wvk-layout" style:max-width={maxWidth}>
    <div class="wvk-pages">
      {#each layoutPages as item (item.entry.key)}
        {@const snapshot = snapshots[item.entry.key]}
        <StackPage
          page={item}
          {direction}
          {transition}
          duration={effectiveDuration}
          onanimationpending={() => whenEntering(item, stack.awaitTransitionStart)}
          onanimationstarted={() => whenEntering(item, stack.onTransitionStart)}
          onanimationended={() => whenEntering(item, stack.endTransition)}
        >
          {#if item.mounted && snapshot}
            <FrozenPage
              {snapshot}
              component={componentFor(snapshot)}
              fallback={item.entry.key === currentEntryKey ? children : undefined}
            />
          {/if}
        </StackPage>
      {/each}
    </div>
  </div>
</div>
