import styled from "@emotion/styled";
import React, { createContext, useContext, useMemo } from "react";
import { STACK_TRANSITION_MS } from "../constants";
import { StackDevRoadmap } from "../stack-dev/stack-dev-roadmap";
import type {
  Activity,
  HistoryState,
  StackRouterProviderProps,
  StackTransitionType,
  VisiblePage,
} from "../type";
import StackHeader, { type HeaderMotion } from "./_components/header";
import StackPage from "./_components/stack-page";
import { ActivityContext } from "./activity-context";
import {
  getRenderedPages,
  type StackEntry,
  type StackState,
} from "./stack-reducer";
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

/** 전환 중이면 헤더가 이전 화면 제목·back 버튼을 같이 그릴 정보 */
function getHeaderMotion(
  state: StackState,
  transitionType: StackTransitionType,
  duration: number
): HeaderMotion | null {
  const { transition, entries, leaving } = state;
  if (!transition || duration === 0) return null;
  const exitKey =
    transition.type === "push"
      ? transition.exitKey
      : transition.exitKeys[transition.exitKeys.length - 1];
  const exitEntry = [...entries, ...leaving].find(
    (entry) => entry.key === exitKey
  );
  if (!exitEntry) return null;
  return {
    direction: transition.type,
    transitionType,
    duration,
    exitKey,
    exitPath: exitEntry.path,
    // push 전 깊이는 지금보다 1 작고, pop 전에는 항상 2 이상이었다
    backWasVisible: transition.type === "pop" || entries.length > 2,
  };
}

const isDevEnv = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV === "development";

const StackRouterProvider = ({
  initialActivity,
  Activities = [],
  maxWidth = "600px",
  isShowHeader = false,
  headerTransition = true,
  enableDevTools,
  transition = "slide",
  duration = STACK_TRANSITION_MS,
  restoreStack = "with-root",
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
  const showDevTools = enableDevTools ?? isDevEnv();

  return (
    <StackRouterContext.Provider value={value}>
      <LayoutContainer safeArea={safeArea}>
        <Layout maxWidth={maxWidth} data-testid="layout">
          {isShowHeader && (
            <StackHeader
              motion={
                headerTransition
                  ? getHeaderMotion(state, transition, effectiveDuration)
                  : null
              }
            />
          )}
          <PageContainer>
            {pages.map(({ entry, pageState, isTop }, index) => (
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
                  {elementFor(entry.pattern)}
                </StackPage>
              </ActivityContext.Provider>
            ))}
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
