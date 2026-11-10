import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEV_MOUNTED_PAGES_WARN,
  KEEP_ALIVE_LIMIT,
  STACK_TRANSITION_MS,
} from "../constants";
import type {
  Activity,
  StackRouterProviderProps,
  VisiblePage,
} from "../react-types";
import { StackDevRoadmap } from "../stack-dev/stack-dev-roadmap";
import type { HistoryState } from "../type";
import StackHeader from "./_components/header";
import StackPage from "./_components/stack-page";
import { ActivityContext } from "./activity-context";
import { createPageLayout, toActivityInfo } from "./page-layout";
import type { StackEntry } from "./stack-reducer";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";
import { useStackBridgeSync } from "./use-stack-bridge-sync";
import { useStackNavigation } from "./use-stack-navigation";
import { useStackStyles } from "./use-stack-styles";

export interface StackRouterContextValue {
  currentPath: string;
  /** top 엔트리의 history state */
  currentState: HistoryState;
  depth: number;
  canGoBack: boolean;
  isTransitioning: boolean;
  entries: StackEntry[];
  /** 1.x 호환 */
  visiblePages: VisiblePage[];
  Activities: Activity[];
  initialActivity: Activity;
  push: (path: string, data?: unknown) => boolean;
  replace: (path: string, data?: unknown) => boolean;
  reset: (path: string, data?: unknown) => boolean;
  /** 루트만 남기고 path 를 push 한다 (스택: [루트, path]) */
  resetPush: (path: string, data?: unknown) => boolean;
  back: () => boolean;
  pop: (count?: number) => boolean;
  popTo: (path: string) => boolean;
  /** @deprecated 스택과 동기화되지 않는다. 브라우저 forward 는 popstate 로 처리된다 */
  forward: () => void;
}

const StackRouterContext = createContext<StackRouterContextValue | null>(null);

/** StackRouterProvider 밖이면 null. 스택 안·밖에서 같이 쓰는 링크·훅에서 쓴다 */
export const useOptionalStackRouter = () => useContext(StackRouterContext);

export const useStackRouter = () => {
  const context = useOptionalStackRouter();
  if (!context) {
    throw new Error("useStackRouter must be used within a StackRouterProvider");
  }
  return context;
};

const isDevEnv = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV === "development";

const StackRouterProvider = ({
  initialActivity,
  Activities = [],
  maxWidth = "600px",
  isShowHeader = false,
  enableDevTools,
  transition = "slide",
  duration = STACK_TRANSITION_MS,
  popStateTransition = "animate",
  restoreStack = "with-root",
  keepAliveLimit = KEEP_ALIVE_LIMIT,
  maxMountedPages,
  safeArea = false,
  onBackAtRoot,
  onNotFound,
  bridge,
}: StackRouterProviderProps) => {
  useStackStyles();
  const reducedMotion = usePrefersReducedMotion();
  const effectiveDuration =
    transition === "none" || reducedMotion ? 0 : duration;

  const navigation = useStackNavigation({
    initialActivity,
    activities: Activities,
    duration: effectiveDuration,
    popStateTransition,
    restoreStack,
    keepAliveLimit,
    onBackAtRoot,
    onNotFound,
  });
  const { state, endTransition, awaitTransitionStart, onTransitionStart } =
    navigation;

  const elementFor = (pattern: string) =>
    Activities.find((activity) => activity.path === pattern)?.element ??
    (initialActivity.path === pattern ? initialActivity.element : null);

  const top = state.entries[state.entries.length - 1];

  const value = useMemo<StackRouterContextValue>(
    () => ({
      currentPath: top.path,
      currentState: {
        path: top.path,
        data: top.data,
        key: top.key,
        index: state.entries.length - 1,
      },
      depth: state.entries.length,
      canGoBack: state.entries.length > 1,
      isTransitioning: state.transition !== null,
      entries: state.entries,
      visiblePages: state.entries.map((entry) => ({
        path: entry.path,
        element: elementFor(entry.pattern),
      })),
      Activities,
      initialActivity,
      push: navigation.push,
      replace: navigation.replace,
      reset: navigation.reset,
      resetPush: navigation.resetPush,
      back: navigation.back,
      pop: navigation.pop,
      popTo: navigation.popTo,
      forward: () => window.history.forward(),
    }),
    [state, Activities, initialActivity, navigation]
  );

  useStackBridgeSync(bridge, navigation.navigator, onBackAtRoot);

  const direction = state.transition?.type ?? "push";
  const [layoutPages] = useState(createPageLayout);
  const pages = layoutPages(state, { maxMountedPages });
  const mountedCount = pages.filter((page) => page.mounted).length;

  const hasWarnedRef = useRef(false);
  useEffect(() => {
    if (
      hasWarnedRef.current ||
      !isDevEnv() ||
      mountedCount <= DEV_MOUNTED_PAGES_WARN
    ) {
      return;
    }
    hasWarnedRef.current = true;
    console.warn(
      `[webviewkit] 마운트된 페이지가 ${mountedCount}개입니다. 메모리 사용이 커질 수 있으니 maxMountedPages 로 상한을 두세요.`
    );
  }, [mountedCount]);

  const showDevTools = enableDevTools ?? false;

  return (
    <StackRouterContext.Provider value={value}>
      <div className="wvk-root" data-safe-area={safeArea ? "" : undefined}>
        <div className="wvk-layout" style={{ maxWidth }} data-testid="layout">
          <div className="wvk-pages">
            {pages.map((page) => {
              const { entry, pageState, mounted } = page;
              return (
                <ActivityContext.Provider
                  key={entry.key}
                  value={toActivityInfo(page)}
                >
                  <StackPage
                    page={page}
                    direction={direction}
                    transition={transition}
                    duration={effectiveDuration}
                    onAnimationPending={
                      pageState === "enter" ? awaitTransitionStart : undefined
                    }
                    onAnimationStart={
                      pageState === "enter" ? onTransitionStart : undefined
                    }
                    onAnimationEnd={
                      pageState === "enter" ? endTransition : undefined
                    }
                  >
                    {mounted && isShowHeader && <StackHeader />}
                    {mounted ? elementFor(entry.pattern) : null}
                  </StackPage>
                </ActivityContext.Provider>
              );
            })}
          </div>
        </div>
      </div>
      <StackDevRoadmap
        visible={showDevTools}
        pages={state.entries.map((entry) => ({ path: entry.path }))}
        currentPath={top.path}
      />
    </StackRouterContext.Provider>
  );
};

export default StackRouterProvider;
export { StackRouterProvider };
