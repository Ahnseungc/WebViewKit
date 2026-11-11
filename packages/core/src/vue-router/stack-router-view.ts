import {
  type Component,
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  type PropType,
  provide,
  reactive,
  shallowRef,
  type SlotsType,
  Suspense,
  type VNode,
  watch,
  watchEffect,
} from "vue";
import {
  routeLocationKey,
  type RouteLocationNormalizedLoaded,
  RouterView,
  useRouter,
} from "vue-router";
import { KEEP_ALIVE_LIMIT, STACK_TRANSITION_MS } from "../constants";
import type {
  ConnectStackBridgeOptions,
  StackBridgeSyncOptions,
} from "../stack-router/bridge-sync";
import {
  createPageLayout,
  type StackPageLayout,
} from "../stack-router/page-layout";
import {
  prefersReducedMotion,
  watchReducedMotion,
} from "../stack-router/reduced-motion";
import {
  createRouterStack,
  type RouterLocation,
} from "../stack-router/router-stack";
import {
  connectRouterStackBridge,
  createRouterStackActions,
  type RouterStackActionOptions,
} from "../stack-router/router-stack-actions";
import { findRevivable } from "../stack-router/stack-reducer";
import { stackStyles, STYLE_ATTRIBUTE } from "../stack-router/styles";
import type { PopStateTransition, StackTransitionType } from "../type";
import { StackPage } from "../vue/stack-page";
import { RouterStackKey, type VueRouterStack } from "./context";
import {
  createLocationKeys,
  historyPosition,
  listenRouterLocations,
  toStackPath,
} from "./location";

export interface StackRouterViewSlotProps {
  /** 이 페이지가 들어올 때의 route. 덮이거나 나가는 동안에도 바뀌지 않는다 */
  route: RouteLocationNormalizedLoaded;
}

/** 아직 스택에 없는 페이지 (async setup·데이터 대기 중). 보이지 않게 미리 그린다 */
interface PendingPage {
  location: RouterLocation;
}

/**
 * 페이지 안 `useRoute()` (vue-router `routeLocationKey`) 를 그 페이지의 route 로 고정한다.
 * vue-router 가 app 에 provide 하는 방식과 같이 key 마다 computed 로 감싼다
 */
const FrozenRoute = defineComponent({
  name: "WvkFrozenRoute",
  props: {
    route: {
      type: Object as PropType<RouteLocationNormalizedLoaded>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const fields: Record<string, unknown> = {};
    Object.keys(props.route).forEach((key) => {
      fields[key] = computed(
        () => (props.route as unknown as Record<string, unknown>)[key]
      );
    });
    provide(
      routeLocationKey,
      reactive(fields) as unknown as RouteLocationNormalizedLoaded
    );
    return () => slots.default?.();
  },
});

/** 보관 중인 페이지처럼 숨겨 그린다. 데이터가 준비되면 같은 key 로 스택에 들어간다 */
const toPendingLayout = ({ location }: PendingPage): StackPageLayout => ({
  entry: {
    key: location.key,
    path: location.path,
    pattern: location.path,
    params: {},
    query: {},
  },
  pageState: "cached",
  isTop: false,
  zIndex: 0,
  activityIndex: -1,
  mounted: true,
});

const SuspenseComponent = Suspense as unknown as Component;

/**
 * `<RouterView>`·`<NuxtPage>` 자리에 둔다. URL·history·데이터는 Vue Router(Nuxt)가 맡고,
 * 이 컴포넌트는 페이지를 history 항목별로 쌓아 iOS 식 push/pop 으로 그린다.
 * 덮이거나 나가는 페이지는 들어올 때의 route 로 고정된다 (`useRoute()` params·path).
 *
 * - 기본: 페이지마다 `<RouterView :route>` 를 그린다
 * - Nuxt: `<StackRouterView v-slot="{ route }"><NuxtPage :route="route" /></StackRouterView>`
 *
 * 새 페이지는 async setup(useFetch·useAsyncData 등)이 끝난 뒤 스택에 넣어 내용과 함께 전환한다
 */
export const StackRouterView = defineComponent({
  name: "WvkStackRouterView",
  props: {
    transition: {
      type: String as PropType<StackTransitionType>,
      default: "slide",
    },
    duration: { type: Number, default: STACK_TRANSITION_MS },
    popStateTransition: {
      type: String as PropType<PopStateTransition>,
      default: "animate",
    },
    maxWidth: { type: String, default: "600px" },
    /** 스택 top 에서부터 내용을 마운트할 최대 페이지 수 */
    maxMountedPages: Number,
    safeArea: Boolean,
    /**
     * true 를 돌려주는 path 는 스택에서 빠져도 보관하고, 다시 오면 그 인스턴스(입력·스크롤)를 되살린다.
     * route `meta.keepAlive: true` (Nuxt `definePageMeta({ keepAlive: true })`) 도 같다
     */
    keepAlive: Function as PropType<(path: string) => boolean>,
    /** keepAlive 페이지 최대 보관 수 (마운트 시 1회만 읽는다) */
    keepAliveLimit: { type: Number, default: KEEP_ALIVE_LIMIT },
    /** 루트에서 back 했을 때 (useStack().back, native back.request) */
    onBackAtRoot: Function as PropType<() => void>,
    /** native 앱이 스택을 움직이고 하드웨어 back 에 응답하게 한다 */
    bridge: {
      type: [Boolean, Object] as PropType<boolean | StackBridgeSyncOptions>,
      default: false,
    },
  },
  slots: Object as SlotsType<{ default: StackRouterViewSlotProps }>,
  setup(props, { slots }) {
    const router = useRouter();
    const isClient = typeof window !== "undefined";

    // 서버와 첫 클라이언트 렌더를 맞추려고 마운트 뒤에 읽는다
    const reducedMotion = shallowRef(false);
    const effectiveDuration = computed(() =>
      props.transition === "none" || reducedMotion.value ? 0 : props.duration
    );
    const stackOptions = () => ({
      duration: effectiveDuration.value,
      popStateTransition: props.popStateTransition,
      keepAliveLimit: props.keepAliveLimit,
    });
    const isKeepAlive = (route: RouteLocationNormalizedLoaded) =>
      route.meta.keepAlive === true ||
      props.keepAlive?.(toStackPath(route)) === true;

    const keys = createLocationKeys();
    const initialRoute = router.currentRoute.value;
    const initialPosition = historyPosition();
    const initialKey = keys.initial(initialPosition);
    const stack = createRouterStack(
      {
        key: initialKey,
        path: toStackPath(initialRoute),
        index: initialPosition,
        keepAlive: isKeepAlive(initialRoute),
      },
      stackOptions()
    );
    watchEffect(() => stack.setOptions(stackOptions()), { flush: "sync" });

    const state = shallowRef(stack.getState());
    const unsubscribe = stack.subscribe(() => {
      state.value = stack.getState();
    });

    // 엔트리 key → 들어올 때의 route. 현재 location 의 엔트리만 새 route 로 바꾼다
    const routes = new Map([[initialKey, initialRoute]]);
    const pending = shallowRef<PendingPage | null>(null);
    const routesVersion = shallowRef(0);
    const setRoute = (key: string, route: RouteLocationNormalizedLoaded) => {
      routes.set(key, route);
      routesVersion.value++;
    };

    /** 이미 그려 둔 인스턴스(스택·보관·되살릴 keepAlive)로 갈 수 있으면 데이터 대기 없이 바로 전환한다 */
    const isRendered = (location: RouterLocation) => {
      const current = stack.getState();
      const entryKey = stack.entryKeyFor(location.key);
      const rendered = [
        ...current.entries,
        ...current.leaving,
        ...current.cached,
      ].some((entry) => entry.key === entryKey);
      if (rendered) return true;
      return (
        location.action === "push" &&
        Boolean(location.keepAlive) &&
        findRevivable(current, location.path) !== undefined
      );
    };

    const commit = (
      location: RouterLocation,
      route: RouteLocationNormalizedLoaded
    ) => {
      pending.value = null;
      stack.sync(location);
      setRoute(stack.entryKeyFor(location.key), route);
    };

    const handleResolve = (key: string) => {
      const waiting = pending.value;
      if (!waiting || waiting.location.key !== key) return;
      commit(waiting.location, routes.get(key)!);
    };

    const stopListening = isClient
      ? listenRouterLocations(router, (action, route, position, isInitial) => {
          const path = toStackPath(route);
          const top = state.value.entries[state.value.entries.length - 1];
          // 마운트가 첫 이동보다 빨랐다면 같은 화면이므로 route 만 채운다
          if (isInitial && top.path === path) {
            setRoute(top.key, route);
            return;
          }
          const location: RouterLocation = {
            key: keys.next(action, position),
            path,
            action,
            index: position,
            keepAlive: isKeepAlive(route),
          };
          if (isRendered(location)) {
            commit(location, route);
            return;
          }
          setRoute(location.key, route);
          pending.value = { location };
        })
      : () => {};

    // 액션·브릿지는 호출 시점에 옵션을 읽으므로 같은 객체를 고쳐 쓴다
    const actionOptions: RouterStackActionOptions = {};
    const bridgeOptions: ConnectStackBridgeOptions = {};
    watchEffect(() => {
      actionOptions.onBackAtRoot = props.onBackAtRoot;
      Object.assign(
        bridgeOptions,
        typeof props.bridge === "object" ? props.bridge : {},
        { onBackAtRoot: props.onBackAtRoot }
      );
    });
    const actions = createRouterStackActions(
      stack,
      {
        navigate: (path, options) => {
          void (options?.replace ? router.replace(path) : router.push(path));
        },
        go: (delta) => router.go(delta),
      },
      actionOptions
    );
    const value: VueRouterStack = reactive({
      ...actions,
      depth: computed(() => state.value.entries.length),
      canGoBack: computed(() => state.value.entries.length > 1),
      isTransitioning: computed(() => state.value.transition !== null),
    });
    provide(RouterStackKey, value);

    const cleanups: (() => void)[] = [];
    onMounted(() => {
      reducedMotion.value = prefersReducedMotion();
      cleanups.push(
        watchReducedMotion((reduced) => {
          reducedMotion.value = reduced;
        })
      );
      cleanups.push(
        watch(
          () => Boolean(props.bridge),
          (enabled, _, onCleanup) => {
            if (enabled) {
              onCleanup(
                connectRouterStackBridge(stack, actions, bridgeOptions)
              );
            }
          },
          { immediate: true }
        )
      );
    });
    onBeforeUnmount(() => {
      stopListening();
      unsubscribe();
      stack.dispose();
      cleanups.forEach((cleanup) => cleanup());
    });

    const layout = createPageLayout();
    let renderedKeys = new Set<string>();
    // 스택·대기에서 빠진 페이지의 route 는 버린다
    onUpdated(() => {
      routes.forEach((_, key) => {
        if (!renderedKeys.has(key)) routes.delete(key);
      });
    });

    const renderContent = (key: string): VNode | null => {
      const route = routes.get(key);
      if (!route) return null;
      return h(
        SuspenseComponent,
        { onResolve: () => handleResolve(key) },
        {
          default: () =>
            h(FrozenRoute, { route }, () =>
              slots.default
                ? slots.default({ route })
                : h(RouterView, { route })
            ),
        }
      );
    };

    return () => {
      void routesVersion.value;
      const current = state.value;
      const direction = current.transition?.type ?? "push";
      const pages = layout(current, { maxMountedPages: props.maxMountedPages });
      const waiting = pending.value;
      if (
        waiting &&
        !pages.some((page) => page.entry.key === waiting.location.key)
      ) {
        pages.push(toPendingLayout(waiting));
      }
      renderedKeys = new Set(pages.map((page) => page.entry.key));

      return h(
        "div",
        {
          class: "wvk-root",
          "data-safe-area": props.safeArea ? "" : undefined,
        },
        [
          // SSR HTML 에 함께 넣어 첫 페인트부터 스타일을 적용한다
          h("style", { [STYLE_ATTRIBUTE]: "", innerHTML: stackStyles }),
          h(
            "div",
            { class: "wvk-layout", style: { maxWidth: props.maxWidth } },
            h(
              "div",
              { class: "wvk-pages" },
              pages.map((page) => {
                const isEnter = page.pageState === "enter";
                return h(
                  StackPage,
                  {
                    key: page.entry.key,
                    page,
                    direction,
                    transition: props.transition,
                    duration: effectiveDuration.value,
                    onAnimationPending: isEnter
                      ? stack.awaitTransitionStart
                      : undefined,
                    onAnimationStart: isEnter
                      ? stack.onTransitionStart
                      : undefined,
                    onAnimationEnd: isEnter ? stack.endTransition : undefined,
                  },
                  () => (page.mounted ? [renderContent(page.entry.key)] : [])
                );
              })
            )
          ),
        ]
      );
    };
  },
});
