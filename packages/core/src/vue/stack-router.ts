import {
  type Component,
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  provide,
  reactive,
  ref,
  shallowRef,
  toRaw,
  watch,
  watchEffect,
} from "vue";
import { KEEP_ALIVE_LIMIT, STACK_TRANSITION_MS } from "../constants";
import {
  connectStackBridge,
  type ConnectStackBridgeOptions,
  type StackBridgeSyncOptions,
} from "../stack-router/bridge-sync";
import {
  createStackNavigator,
  type StackNavigatorOptions,
} from "../stack-router/navigator";
import { createPageLayout } from "../stack-router/page-layout";
import {
  prefersReducedMotion,
  watchReducedMotion,
} from "../stack-router/reduced-motion";
import { ensureStackStyles } from "../stack-router/styles";
import type {
  ActivityRoute,
  PopStateTransition,
  RestoreStackPolicy,
  StackTransitionType,
} from "../type";
import { StackRouterKey, type VueStackRouter } from "./context";
import { StackHeader } from "./header";
import { StackPage } from "./stack-page";

export interface VueActivity extends ActivityRoute {
  component: Component;
}

/**
 * Vue 스택 라우터. props 는 React `StackRouterProvider` 와 같다 (`Activities` → `activities`, `element` → `component`).
 * `keepAliveLimit` 은 마운트 시 1회만 읽는다
 */
export const StackRouter = defineComponent({
  name: "WvkStackRouter",
  props: {
    initialActivity: {
      type: Object as PropType<VueActivity>,
      required: true,
    },
    activities: {
      type: Array as PropType<VueActivity[]>,
      default: () => [],
    },
    maxWidth: { type: String, default: "600px" },
    /** true면 각 페이지 상단에 `StackHeader` 렌더 (페이지와 함께 전환) */
    isShowHeader: Boolean,
    transition: {
      type: String as PropType<StackTransitionType>,
      default: "slide",
    },
    duration: { type: Number, default: STACK_TRANSITION_MS },
    popStateTransition: {
      type: String as PropType<PopStateTransition>,
      default: "animate",
    },
    restoreStack: {
      type: String as PropType<RestoreStackPolicy>,
      default: "with-root",
    },
    keepAliveLimit: { type: Number, default: KEEP_ALIVE_LIMIT },
    /** 스택 top 에서부터 내용을 마운트할 최대 페이지 수 (기본 제한 없음, 1 미만은 1) */
    maxMountedPages: Number,
    /** env(safe-area-inset-*) padding 적용 */
    safeArea: Boolean,
    /** 네이티브 브릿지 연동 */
    bridge: {
      type: [Boolean, Object] as PropType<boolean | StackBridgeSyncOptions>,
      default: false,
    },
    /** 루트에서 back 했을 때 (앱 종료·WebView 닫기 위임) */
    onBackAtRoot: Function as PropType<() => void>,
    /** 등록되지 않은 경로로 이동하려 할 때 */
    onNotFound: Function as PropType<(path: string) => void>,
  },
  setup(props) {
    ensureStackStyles();

    const reducedMotion = ref(prefersReducedMotion());
    const effectiveDuration = computed(() =>
      props.transition === "none" || reducedMotion.value ? 0 : props.duration
    );
    const navigatorOptions = (): StackNavigatorOptions<VueActivity> => ({
      initialActivity: props.initialActivity,
      activities: props.activities,
      duration: effectiveDuration.value,
      popStateTransition: props.popStateTransition,
      restoreStack: props.restoreStack,
      keepAliveLimit: props.keepAliveLimit,
      onBackAtRoot: props.onBackAtRoot,
      onNotFound: props.onNotFound,
    });
    const navigator = createStackNavigator(navigatorOptions());
    watchEffect(() => navigator.setOptions(navigatorOptions()), {
      flush: "sync",
    });

    const state = shallowRef(navigator.getState());
    const unsubscribe = navigator.subscribe(() => {
      state.value = navigator.getState();
    });

    const top = computed(
      () => state.value.entries[state.value.entries.length - 1]
    );
    const router: VueStackRouter = reactive({
      currentPath: computed(() => top.value.path),
      currentState: computed(() => ({
        path: top.value.path,
        data: top.value.data,
        key: top.value.key,
        index: state.value.entries.length - 1,
      })),
      depth: computed(() => state.value.entries.length),
      canGoBack: computed(() => state.value.entries.length > 1),
      isTransitioning: computed(() => state.value.transition !== null),
      entries: computed(() => state.value.entries),
      push: navigator.push,
      replace: navigator.replace,
      reset: navigator.reset,
      resetPush: navigator.resetPush,
      back: navigator.back,
      pop: navigator.pop,
      popTo: navigator.popTo,
    });
    provide(StackRouterKey, router);

    // connectStackBridge 는 필드를 호출 시점에 읽으므로 같은 객체를 고쳐 쓴다
    const bridgeOptions: ConnectStackBridgeOptions = {};
    watchEffect(() => {
      const options = typeof props.bridge === "object" ? props.bridge : {};
      bridgeOptions.allowUrl = options.allowUrl;
      bridgeOptions.onError = options.onError;
      bridgeOptions.emitStackChanged = options.emitStackChanged;
      bridgeOptions.onBackAtRoot = props.onBackAtRoot;
    });

    const cleanups: (() => void)[] = [];
    onMounted(() => {
      cleanups.push(navigator.start());
      cleanups.push(
        watchReducedMotion((reduced) => {
          reducedMotion.value = reduced;
        })
      );
      cleanups.push(
        watch(
          () => Boolean(props.bridge),
          (enabled, _, onCleanup) => {
            if (enabled)
              onCleanup(connectStackBridge(navigator, bridgeOptions));
          },
          { immediate: true }
        )
      );
    });
    onBeforeUnmount(() => {
      unsubscribe();
      cleanups.forEach((cleanup) => cleanup());
    });

    const componentFor = (pattern: string) =>
      props.activities.find((activity) => activity.path === pattern)
        ?.component ??
      (props.initialActivity.path === pattern
        ? props.initialActivity.component
        : null);

    const layout = createPageLayout();

    return () => {
      const current = state.value;
      const direction = current.transition?.type ?? "push";
      const pages = layout(current, { maxMountedPages: props.maxMountedPages });
      return h(
        "div",
        {
          class: "wvk-root",
          "data-safe-area": props.safeArea ? "" : undefined,
        },
        h(
          "div",
          {
            class: "wvk-layout",
            style: { maxWidth: props.maxWidth },
            "data-testid": "layout",
          },
          h(
            "div",
            { class: "wvk-pages" },
            pages.map((page) => {
              const isEnter = page.pageState === "enter";
              const component = componentFor(page.entry.pattern);
              return h(
                StackPage,
                {
                  key: page.entry.key,
                  page,
                  direction,
                  transition: props.transition,
                  duration: effectiveDuration.value,
                  onAnimationPending: isEnter
                    ? navigator.awaitTransitionStart
                    : undefined,
                  onAnimationStart: isEnter
                    ? navigator.onTransitionStart
                    : undefined,
                  onAnimationEnd: isEnter ? navigator.endTransition : undefined,
                },
                () =>
                  page.mounted
                    ? [
                        props.isShowHeader ? h(StackHeader) : null,
                        // activities 가 ref 로 감싸져도 컴포넌트는 reactive 로 넘기지 않는다
                        component ? h(toRaw(component)) : null,
                      ]
                    : []
              );
            })
          )
        )
      );
    };
  },
});
