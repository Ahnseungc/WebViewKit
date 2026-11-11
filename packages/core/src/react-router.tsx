"use client";
/**
 * `@ahnseungchan/webviewkit/react-router` — React Router 위에 스택 전환을 얹는다.
 * URL·history·loader(SSR 포함)는 React Router 가 맡고, 이 컴포넌트는 `useOutlet()` 결과를
 * location key 별로 쌓아 iOS 식 push/pop 으로 그린다. 이동은 `<Link>`·`useNavigate` 그대로 쓴다.
 */
import React, {
  type ContextType,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type NavigateFunction,
  UNSAFE_DataRouterStateContext as DataRouterStateContext,
  UNSAFE_LocationContext as LocationContext,
  useLocation,
  useNavigate,
  useNavigationType,
  useOutlet,
} from "react-router";
import StackPage from "./stack-router/_components/stack-page";
import StackStyles from "./stack-router/_components/stack-styles";
import type {
  ConnectStackBridgeOptions,
  StackBridgeSyncOptions,
} from "./stack-router/bridge-sync";
import { createPageLayout } from "./stack-router/page-layout";
import {
  createRouterStack,
  type RouterLocation,
  type RouterStack,
} from "./stack-router/router-stack";
import {
  connectRouterStackBridge,
  createRouterStackActions,
  type RouterStackActionOptions,
  type RouterStackActions,
} from "./stack-router/router-stack-actions";
import type { StackState } from "./stack-router/stack-reducer";
import { usePrefersReducedMotion } from "./stack-router/use-prefers-reduced-motion";
import { KEEP_ALIVE_LIMIT, STACK_TRANSITION_MS } from "./constants";
import type { PopStateTransition, StackTransitionType } from "./type";

export interface StackOutletProps {
  transition?: StackTransitionType;
  duration?: number;
  popStateTransition?: PopStateTransition;
  maxWidth?: string;
  /** 스택 top 에서부터 내용을 마운트할 최대 페이지 수 */
  maxMountedPages?: number;
  safeArea?: boolean;
  /** true 를 돌려주는 path 는 스택에서 빠져도 보관하고, 다시 오면 그 인스턴스(입력·스크롤)를 되살린다 */
  keepAlive?: (path: string) => boolean;
  /** keepAlive 페이지 최대 보관 수 (마운트 시 1회만 읽는다) */
  keepAliveLimit?: number;
  /** 루트에서 back 했을 때 (useStack().back, native back.request) */
  onBackAtRoot?: () => void;
  /** native 앱이 스택을 움직이고 하드웨어 back 에 응답하게 한다 */
  bridge?: boolean | StackBridgeSyncOptions;
}

export interface StackContextValue extends RouterStackActions {
  depth: number;
  canGoBack: boolean;
  isTransitioning: boolean;
}

/** 페이지가 들어올 때의 화면과 라우터 값. 덮이거나 나가는 페이지가 새 location 을 읽지 않게 고정한다 */
interface PageSnapshot {
  outlet: ReactNode;
  location: ContextType<typeof LocationContext>;
  dataState: ContextType<typeof DataRouterStateContext>;
}

const StackContext = createContext<StackContextValue | null>(null);

/** `<StackOutlet>` 안에서 스택 깊이와 이동 함수 */
export const useStack = () => {
  const context = useContext(StackContext);
  if (!context) throw new Error("useStack must be used within a StackOutlet");
  return context;
};

const ACTION_BY_NAVIGATION_TYPE: Record<string, RouterLocation["action"]> = {
  PUSH: "push",
  REPLACE: "replace",
  POP: "pop",
};

/** React Router 가 history.state 에 남기는 위치. 서버에선 없다 */
const historyIndex = () =>
  typeof window === "undefined"
    ? undefined
    : (window.history.state as { idx?: number } | null)?.idx;

/** react-router 가 UNSAFE 컨텍스트를 빼면 고정 없이 그린다 (덮인 페이지가 새 location 을 읽을 수 있다) */
const canFreeze = Boolean(LocationContext && DataRouterStateContext);

const Frozen = ({ snapshot }: { snapshot: PageSnapshot }) =>
  canFreeze ? (
    <LocationContext.Provider value={snapshot.location}>
      <DataRouterStateContext.Provider value={snapshot.dataState}>
        {snapshot.outlet}
      </DataRouterStateContext.Provider>
    </LocationContext.Provider>
  ) : (
    <>{snapshot.outlet}</>
  );

function useStackActions(
  stack: RouterStack,
  navigate: NavigateFunction,
  onBackAtRoot?: () => void
) {
  // 액션은 호출 시점에 옵션을 읽으므로 같은 객체를 고쳐 쓴다
  const [options] = useState<RouterStackActionOptions>({});
  options.onBackAtRoot = onBackAtRoot;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [actions] = useState(() =>
    createRouterStackActions(
      stack,
      {
        navigate: (path, opts) => void navigateRef.current(path, opts),
        go: (delta) => void navigateRef.current(delta),
      },
      options
    )
  );
  return actions;
}

function useRouterStackBridge(
  bridge: StackOutletProps["bridge"],
  stack: RouterStack,
  actions: RouterStackActions,
  onBackAtRoot?: () => void
) {
  const enabled = Boolean(bridge);
  const [options] = useState<ConnectStackBridgeOptions>({});
  const bridgeOptions = typeof bridge === "object" ? bridge : {};
  Object.assign(options, bridgeOptions, { onBackAtRoot });
  useEffect(() => {
    if (!enabled) return;
    return connectRouterStackBridge(stack, actions, options);
  }, [enabled, stack, actions, options]);
}

const toContextValue = (
  state: StackState,
  actions: RouterStackActions
): StackContextValue => ({
  ...actions,
  depth: state.entries.length,
  canGoBack: state.entries.length > 1,
  isTransitioning: state.transition !== null,
});

export const StackOutlet = ({
  transition = "slide",
  duration = STACK_TRANSITION_MS,
  popStateTransition = "animate",
  maxWidth = "600px",
  maxMountedPages,
  safeArea = false,
  keepAlive,
  keepAliveLimit = KEEP_ALIVE_LIMIT,
  onBackAtRoot,
  bridge,
}: StackOutletProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const effectiveDuration =
    transition === "none" || reducedMotion ? 0 : duration;
  const stackOptions = {
    duration: effectiveDuration,
    popStateTransition,
    keepAliveLimit,
  };

  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const locationContext = useContext(LocationContext);
  const dataState = useContext(DataRouterStateContext);
  const path = location.pathname + location.search;

  const [stack] = useState(() =>
    createRouterStack(
      {
        key: location.key,
        path,
        index: historyIndex(),
        keepAlive: keepAlive?.(path),
      },
      stackOptions
    )
  );
  stack.setOptions(stackOptions);

  const snapshots = useRef(new Map<string, PageSnapshot>());
  // 지금 location 의 페이지만 갱신한다 (loader 재검증·되살린 data 반영). 나머지는 들어올 때 값 그대로
  snapshots.current.set(stack.entryKeyFor(location.key), {
    outlet,
    location: locationContext,
    dataState,
  });

  useLayoutEffect(() => {
    stack.sync({
      key: location.key,
      path,
      action: ACTION_BY_NAVIGATION_TYPE[navigationType] ?? "push",
      index: historyIndex(),
      keepAlive: keepAlive?.(path),
    });
    // location 이 바뀔 때만 스택에 반영한다
  }, [location.key]);

  useEffect(() => stack.dispose, [stack]);

  const state = useSyncExternalStore(
    stack.subscribe,
    stack.getState,
    stack.getState
  );
  const actions = useStackActions(stack, navigate, onBackAtRoot);
  useRouterStackBridge(bridge, stack, actions, onBackAtRoot);
  const value = useMemo(() => toContextValue(state, actions), [state, actions]);

  const [layoutPages] = useState(createPageLayout);
  const pages = layoutPages(state, { maxMountedPages });
  const direction = state.transition?.type ?? "push";

  useEffect(() => {
    const alive = new Set(pages.map((page) => page.entry.key));
    alive.add(stack.entryKeyFor(location.key));
    snapshots.current.forEach((_, key) => {
      if (!alive.has(key)) snapshots.current.delete(key);
    });
  });

  return (
    <StackContext.Provider value={value}>
      <div className="wvk-root" data-safe-area={safeArea ? "" : undefined}>
        <StackStyles />
        <div className="wvk-layout" style={{ maxWidth }}>
          <div className="wvk-pages">
            {pages.map((page) => {
              const { entry, pageState, mounted } = page;
              const snapshot = snapshots.current.get(entry.key);
              const isEntering = pageState === "enter";
              return (
                <StackPage
                  key={entry.key}
                  page={page}
                  direction={direction}
                  transition={transition}
                  duration={effectiveDuration}
                  onAnimationPending={
                    isEntering ? stack.awaitTransitionStart : undefined
                  }
                  onAnimationStart={
                    isEntering ? stack.onTransitionStart : undefined
                  }
                  onAnimationEnd={isEntering ? stack.endTransition : undefined}
                >
                  {mounted && snapshot ? <Frozen snapshot={snapshot} /> : null}
                </StackPage>
              );
            })}
          </div>
        </div>
      </div>
    </StackContext.Provider>
  );
};
