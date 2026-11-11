"use client";
/**
 * `@ahnseungchan/webviewkit/react-router` — React Router 위에 스택 전환을 얹는다.
 * URL·history·loader(SSR 포함)는 React Router 가 맡고, 이 컴포넌트는 `useOutlet()` 결과를
 * location key 별로 쌓아 iOS 식 push/pop 으로 그린다. 이동은 `<Link>`·`useNavigate` 그대로 쓴다.
 */
import React, {
  type ContextType,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  UNSAFE_DataRouterStateContext as DataRouterStateContext,
  UNSAFE_LocationContext as LocationContext,
  useLocation,
  useNavigationType,
  useOutlet,
} from "react-router";
import StackPage from "./stack-router/_components/stack-page";
import { createPageLayout } from "./stack-router/page-layout";
import {
  createRouterStack,
  type RouterLocation,
} from "./stack-router/router-stack";
import { usePrefersReducedMotion } from "./stack-router/use-prefers-reduced-motion";
import { useStackStyles } from "./stack-router/use-stack-styles";
import { STACK_TRANSITION_MS } from "./constants";
import type { PopStateTransition, StackTransitionType } from "./type";

export interface StackOutletProps {
  transition?: StackTransitionType;
  duration?: number;
  popStateTransition?: PopStateTransition;
  maxWidth?: string;
  /** 스택 top 에서부터 내용을 마운트할 최대 페이지 수 */
  maxMountedPages?: number;
  safeArea?: boolean;
}

/** 페이지가 들어올 때의 화면과 라우터 값. 덮이거나 나가는 페이지가 새 location 을 읽지 않게 고정한다 */
interface PageSnapshot {
  outlet: ReactNode;
  location: ContextType<typeof LocationContext>;
  dataState: ContextType<typeof DataRouterStateContext>;
}

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

export const StackOutlet = ({
  transition = "slide",
  duration = STACK_TRANSITION_MS,
  popStateTransition = "animate",
  maxWidth = "600px",
  maxMountedPages,
  safeArea = false,
}: StackOutletProps) => {
  useStackStyles();
  const reducedMotion = usePrefersReducedMotion();
  const effectiveDuration =
    transition === "none" || reducedMotion ? 0 : duration;
  const stackOptions = { duration: effectiveDuration, popStateTransition };

  const location = useLocation();
  const navigationType = useNavigationType();
  const outlet = useOutlet();
  const locationContext = useContext(LocationContext);
  const dataState = useContext(DataRouterStateContext);
  const path = location.pathname + location.search;

  const snapshots = useRef(new Map<string, PageSnapshot>());
  // 지금 location 의 페이지만 갱신한다 (loader 재검증 반영). 나머지는 들어올 때 값 그대로
  snapshots.current.set(location.key, {
    outlet,
    location: locationContext,
    dataState,
  });

  const [stack] = useState(() =>
    createRouterStack(
      { key: location.key, path, index: historyIndex() },
      stackOptions
    )
  );
  stack.setOptions(stackOptions);

  useLayoutEffect(() => {
    stack.sync({
      key: location.key,
      path,
      action: ACTION_BY_NAVIGATION_TYPE[navigationType] ?? "push",
      index: historyIndex(),
    });
    // location 이 바뀔 때만 스택에 반영한다
  }, [location.key]);

  useEffect(() => stack.dispose, [stack]);

  const state = useSyncExternalStore(
    stack.subscribe,
    stack.getState,
    stack.getState
  );
  const [layoutPages] = useState(createPageLayout);
  const pages = layoutPages(state, { maxMountedPages });
  const direction = state.transition?.type ?? "push";

  useEffect(() => {
    const alive = new Set(pages.map((page) => page.entry.key));
    alive.add(location.key);
    snapshots.current.forEach((_, key) => {
      if (!alive.has(key)) snapshots.current.delete(key);
    });
  });

  return (
    <div className="wvk-root" data-safe-area={safeArea ? "" : undefined}>
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
                {mounted && snapshot ? (
                  <LocationContext.Provider value={snapshot.location}>
                    <DataRouterStateContext.Provider value={snapshot.dataState}>
                      {snapshot.outlet}
                    </DataRouterStateContext.Provider>
                  </LocationContext.Provider>
                ) : null}
              </StackPage>
            );
          })}
        </div>
      </div>
    </div>
  );
};
