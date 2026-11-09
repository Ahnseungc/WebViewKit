import styled from "@emotion/styled";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  DEV_MOUNTED_PAGES_WARN,
  KEEP_ALIVE_LIMIT,
  STACK_TRANSITION_MS,
} from "../constants";
import { StackDevRoadmap } from "../stack-dev/stack-dev-roadmap";
import type {
  Activity,
  HistoryState,
  StackRouterProviderProps,
  VisiblePage,
} from "../type";
import StackHeader from "./_components/header";
import StackPage from "./_components/stack-page";
import { ActivityContext } from "./activity-context";
import { getRenderedPages, type StackEntry } from "./stack-reducer";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";
import { useStackBridgeSync } from "./use-stack-bridge-sync";
import { useStackNavigation } from "./use-stack-navigation";

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

export const useStackRouter = () => {
  const context = useContext(StackRouterContext);
  if (!context) {
    throw new Error("useStackRouter must be used within a StackRouterProvider");
  }
  return context;
};

const isDevEnv = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV === "development";

const MIN_MOUNTED_PAGES = 1;

const StackRouterProvider = ({
  initialActivity,
  Activities = [],
  maxWidth = "600px",
  isShowHeader = false,
  enableDevTools,
  transition = "slide",
  duration = STACK_TRANSITION_MS,
  restoreStack = "with-root",
  keepAliveLimit = KEEP_ALIVE_LIMIT,
  maxMountedPages,
  safeArea = false,
  onBackAtRoot,
  onNotFound,
  bridge,
}: StackRouterProviderProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const effectiveDuration =
    transition === "none" || reducedMotion ? 0 : duration;

  const navigation = useStackNavigation({
    initialActivity,
    activities: Activities,
    duration: effectiveDuration,
    restoreStack,
    keepAliveLimit,
    onBackAtRoot,
    onNotFound,
  });
  const { state, endTransition } = navigation;

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

  useStackBridgeSync(bridge, value, onBackAtRoot);

  const direction = state.transition?.type ?? "push";
  const pages = getRenderedPages(state);
  const stackIndexByKey = new Map(
    state.entries.map((entry, index) => [entry.key, index])
  );
  const mountLimit =
    maxMountedPages === undefined
      ? Infinity
      : Math.max(MIN_MOUNTED_PAGES, maxMountedPages);
  const shouldMount = (page: (typeof pages)[number]) => {
    const stackIndex = stackIndexByKey.get(page.entry.key);
    // cached·leaving(스택 밖)·전환 중 페이지, keepAlive 엔트리는 항상 마운트
    if (stackIndex === undefined || page.entry.keepAlive) return true;
    if (page.pageState === "enter" || page.pageState === "exit") return true;
    return state.entries.length - stackIndex <= mountLimit;
  };
  const mountedCount = pages.filter(shouldMount).length;

  // DOM 이동은 스크롤 위치를 초기화하므로 key 의 최초 렌더 순서로 DOM 순서를 고정한다.
  // 쌓임 순서는 getRenderedPages 위치(zIndex)로 표현한다.
  const domOrderRef = useRef<string[]>([]);
  const currentKeys = new Set(pages.map((page) => page.entry.key));
  const knownKeys = new Set(domOrderRef.current);
  domOrderRef.current = [
    ...domOrderRef.current.filter((key) => currentKeys.has(key)),
    ...pages.map((page) => page.entry.key).filter((key) => !knownKeys.has(key)),
  ];
  const domOrder = domOrderRef.current;
  const domPages = pages
    .map((page, index) => ({ page, index }))
    .sort(
      (a, b) =>
        domOrder.indexOf(a.page.entry.key) - domOrder.indexOf(b.page.entry.key)
    );

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

  const showDevTools = enableDevTools ?? isDevEnv();

  return (
    <StackRouterContext.Provider value={value}>
      <LayoutContainer safeArea={safeArea}>
        <Layout maxWidth={maxWidth} data-testid="layout">
          <PageContainer>
            {domPages.map(({ page, index }) => {
              const { entry, pageState, isTop } = page;
              return (
                <ActivityContext.Provider
                  key={entry.key}
                  value={{
                    key: entry.key,
                    path: entry.path,
                    pattern: entry.pattern,
                    params: entry.params,
                    query: entry.query,
                    data: entry.data,
                    index,
                    isTop,
                    isCached: pageState === "cached",
                  }}
                >
                  <StackPage
                    pageState={pageState}
                    direction={direction}
                    transitionType={transition}
                    duration={effectiveDuration}
                    zIndex={index}
                    isTop={isTop}
                    onAnimationEnd={
                      pageState === "enter" ? endTransition : undefined
                    }
                  >
                    {shouldMount(page) && isShowHeader && <StackHeader />}
                    {shouldMount(page) ? elementFor(entry.pattern) : null}
                  </StackPage>
                </ActivityContext.Provider>
              );
            })}
          </PageContainer>
        </Layout>
      </LayoutContainer>
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

/**styles */
const LayoutContainer = styled.div<{ safeArea: boolean }>`
  width: 100%;
  height: 100vh;
  height: 100dvh;
  display: flex;
  justify-content: center;
  background: var(--wvk-page-bg, #ffffff);
  box-sizing: border-box;
  ${({ safeArea }) =>
    safeArea
      ? `padding: env(safe-area-inset-top) env(safe-area-inset-right)
    env(safe-area-inset-bottom) env(safe-area-inset-left);`
      : ""}
`;

const Layout = styled.div<{ maxWidth: string }>`
  width: 100%;
  max-width: ${({ maxWidth }) => maxWidth};
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const PageContainer = styled.div`
  position: relative;
  flex: 1;
  width: 100%;
  overflow: hidden;
`;
