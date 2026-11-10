<script lang="ts">
  import { setContext, untrack } from "svelte";
  import {
    connectStackBridge,
    type ConnectStackBridgeOptions,
    createPageLayout,
    createStackNavigator,
    ensureStackStyles,
    KEEP_ALIVE_LIMIT,
    prefersReducedMotion,
    STACK_TRANSITION_MS,
    type StackNavigatorOptions,
    watchReducedMotion,
  } from "../core.js";
  import { STACK_ROUTER_KEY, type SvelteStackRouter } from "./context.svelte.js";
  import StackHeader from "./StackHeader.svelte";
  import StackPage from "./StackPage.svelte";
  import type { StackRouterProps, SvelteActivity } from "./types.js";

  /**
   * Svelte 스택 라우터. props 는 React `StackRouterProvider` 와 같다 (`Activities` → `activities`, `element` → `component`).
   * `keepAliveLimit` 은 마운트 시 1회만 읽는다
   */
  let {
    initialActivity,
    activities = [],
    maxWidth = "600px",
    isShowHeader = false,
    transition = "slide",
    duration = STACK_TRANSITION_MS,
    popStateTransition = "animate",
    restoreStack = "with-root",
    keepAliveLimit = KEEP_ALIVE_LIMIT,
    maxMountedPages,
    safeArea = false,
    bridge = false,
    onBackAtRoot,
    onNotFound,
  }: StackRouterProps = $props();

  ensureStackStyles();

  let reducedMotion = $state(prefersReducedMotion());
  const effectiveDuration = $derived(
    transition === "none" || reducedMotion ? 0 : duration
  );

  // 네비게이터·브릿지는 필드를 호출 시점에 읽으므로 getter 로 최신 props 를 넘긴다
  const options: StackNavigatorOptions<SvelteActivity> = {
    get initialActivity() {
      return initialActivity;
    },
    get activities() {
      return activities;
    },
    get duration() {
      return effectiveDuration;
    },
    get popStateTransition() {
      return popStateTransition;
    },
    get restoreStack() {
      return restoreStack;
    },
    keepAliveLimit: untrack(() => keepAliveLimit),
    get onBackAtRoot() {
      return onBackAtRoot;
    },
    get onNotFound() {
      return onNotFound;
    },
  };
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

  const navigator = createStackNavigator(options);
  let stackState = $state.raw(navigator.getState());

  const top = $derived(stackState.entries[stackState.entries.length - 1]);
  const router: SvelteStackRouter = {
    get currentPath() {
      return top.path;
    },
    get currentState() {
      return {
        path: top.path,
        data: top.data,
        key: top.key,
        index: stackState.entries.length - 1,
      };
    },
    get depth() {
      return stackState.entries.length;
    },
    get canGoBack() {
      return stackState.entries.length > 1;
    },
    get isTransitioning() {
      return stackState.transition !== null;
    },
    get entries() {
      return stackState.entries;
    },
    push: navigator.push,
    replace: navigator.replace,
    reset: navigator.reset,
    resetPush: navigator.resetPush,
    back: navigator.back,
    pop: navigator.pop,
    popTo: navigator.popTo,
  };
  setContext(STACK_ROUTER_KEY, router);

  // 순서: 구독 → popstate·복원 → 동작 줄이기 → 브릿지 (React·Vue 와 같다)
  $effect(() =>
    navigator.subscribe(() => {
      stackState = navigator.getState();
    })
  );
  $effect(() => untrack(() => navigator.start()));
  $effect(() =>
    watchReducedMotion((reduced) => {
      reducedMotion = reduced;
    })
  );
  $effect(() => {
    if (!bridge) return;
    return untrack(() => connectStackBridge(navigator, bridgeOptions));
  });

  const componentFor = (pattern: string) =>
    activities.find((activity) => activity.path === pattern)?.component ??
    (initialActivity.path === pattern ? initialActivity.component : null);

  const layout = createPageLayout();
  const pages = $derived(layout(stackState, { maxMountedPages }));
  const direction = $derived(stackState.transition?.type ?? "push");
</script>

<div class="wvk-root" data-safe-area={safeArea ? "" : undefined}>
  <div class="wvk-layout" style:max-width={maxWidth} data-testid="layout">
    <div class="wvk-pages">
      {#each pages as page (page.entry.key)}
        {@const Page = componentFor(page.entry.pattern)}
        {@const isEnter = page.pageState === "enter"}
        <StackPage
          {page}
          {direction}
          {transition}
          duration={effectiveDuration}
          onanimationpending={isEnter ? navigator.awaitTransitionStart : undefined}
          onanimationstarted={isEnter ? navigator.onTransitionStart : undefined}
          onanimationended={isEnter ? navigator.endTransition : undefined}
        >
          {#if page.mounted}
            {#if isShowHeader}<StackHeader />{/if}
            {#if Page}<Page />{/if}
          {/if}
        </StackPage>
      {/each}
    </div>
  </div>
</div>
