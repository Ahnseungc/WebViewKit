"use client";
/**
 * `@ahnseungchan/webviewkit/next` — Next App Router 위에 스택 전환을 얹는다.
 * URL·history·RSC 데이터·SSR 은 Next 가 맡고, 이 컴포넌트는 layout 의 `children` 을
 * history 항목별로 쌓아 iOS 식 push/pop 으로 그린다. 이동은 `<Link>`·`useRouter()` 그대로 쓴다.
 *
 * ```tsx
 * // app/layout.tsx (서버 컴포넌트) 안에서
 * <StackLayout>{children}</StackLayout>
 * ```
 *
 * 이동 종류: Next 는 push/replace/pop 을 알려 주지 않으므로 `history.pushState`·`replaceState` 를 감싸
 * 항목마다 key·index 를 `history.state.__wvk` 에 붙인다 (`stack-router/history-entries`).
 * 렌더 뒤 현재 항목 key 가 바뀌었으면 기록된 쓰기 종류(push·replace), 기록이 없으면 back/forward(pop) 로 본다.
 *
 * 고정: 덮이거나 나가는 페이지는 들어올 때의 Next 라우터 컨텍스트(세그먼트 트리·pathname·params·search)를
 * 다시 제공받아, `/detail/1` 이 `/detail/2` 의 값이나 서버 컴포넌트 결과를 읽지 않는다 (`next-internals`).
 */
import { useRouter } from "next/navigation";
import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import StackPage from "./stack-router/_components/stack-page";
import StackStyles from "./stack-router/_components/stack-styles";
import type {
  ConnectStackBridgeOptions,
  StackBridgeSyncOptions,
} from "./stack-router/bridge-sync";
import {
  createHistoryKey,
  type HistoryEntryMeta,
  installHistoryEntries,
  readHistoryEntry,
  takeHistoryWrite,
} from "./stack-router/history-entries";
import { createPageLayout } from "./stack-router/page-layout";
import {
  createRouterStack,
  type RouterStack,
} from "./stack-router/router-stack";
import {
  connectRouterStackBridge,
  createRouterStackActions,
  type RouterDriver,
  type RouterStackActionOptions,
  type RouterStackActions,
} from "./stack-router/router-stack-actions";
import type { StackState } from "./stack-router/stack-reducer";
import { usePrefersReducedMotion } from "./stack-router/use-prefers-reduced-motion";
import { KEEP_ALIVE_LIMIT, STACK_TRANSITION_MS } from "./constants";
import {
  FrozenNextRouter,
  type NextRouterSnapshot,
  snapshotPath,
  useNextRouterSnapshot,
} from "./next-internals";
import type { PopStateTransition, StackTransitionType } from "./type";

export interface StackLayoutProps {
  /** layout 의 `children` */
  children: ReactNode;
  transition?: StackTransitionType;
  duration?: number;
  popStateTransition?: PopStateTransition;
  maxWidth?: string;
  /** 스택 top 에서부터 내용을 마운트할 최대 페이지 수 */
  maxMountedPages?: number;
  safeArea?: boolean;
  /** true 를 돌려주는 path(pathname + search) 는 스택에서 빠져도 보관하고, 다시 오면 그 인스턴스를 되살린다 */
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

const StackContext = createContext<StackContextValue | null>(null);

/** `<StackLayout>` 안에서 스택 깊이와 이동 함수 */
export const useStack = () => {
  const context = useContext(StackContext);
  if (!context) throw new Error("useStack must be used within a StackLayout");
  return context;
};

/** 서버에선 history 가 없다. 화면에 key 를 그리지 않으므로 서버·클라이언트 key 가 달라도 hydration 은 같다 */
const initialHistoryEntry = (): HistoryEntryMeta =>
  readHistoryEntry() ?? { key: createHistoryKey(), index: 0 };

function useStackActions(
  stack: RouterStack,
  router: ReturnType<typeof useRouter>,
  onBackAtRoot?: () => void
) {
  // 액션은 호출 시점에 옵션을 읽으므로 같은 객체를 고쳐 쓴다
  const [options] = useState<RouterStackActionOptions>({});
  options.onBackAtRoot = onBackAtRoot;
  const routerRef = useRef(router);
  routerRef.current = router;
  const [actions] = useState(() => {
    const driver: RouterDriver = {
      navigate: (path, opts) =>
        opts?.replace
          ? routerRef.current.replace(path)
          : routerRef.current.push(path),
      go: (delta) => window.history.go(delta),
    };
    return createRouterStackActions(stack, driver, options);
  });
  return actions;
}

function useRouterStackBridge(
  bridge: StackLayoutProps["bridge"],
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

/**
 * 페이지별 라우터 스냅샷. 렌더 중에는 history 가 아직 새 항목으로 바뀌기 전이라 새 key 를 모른다.
 * 그래서 렌더에서는 지금 top 과 URL 이 같을 때만(refresh·서버 액션 재검증) 갱신하고,
 * URL 이 바뀐 렌더는 기존 스냅샷 그대로 그린 뒤 layout effect 에서 새 항목에 붙인다 (페인트 전 재렌더)
 */
function usePageSnapshots(live: NextRouterSnapshot, initialEntryKey: string) {
  const snapshots = useRef(new Map<string, NextRouterSnapshot>());
  const currentEntryKey = useRef(initialEntryKey);
  const current = snapshots.current.get(currentEntryKey.current);
  if (!current || snapshotPath(current) === snapshotPath(live)) {
    snapshots.current.set(currentEntryKey.current, live);
  }
  const liveRef = useRef(live);
  liveRef.current = live;

  const attach = (entryKey: string) => {
    currentEntryKey.current = entryKey;
    snapshots.current.set(entryKey, liveRef.current);
  };
  const prune = (alive: Set<string>) => {
    alive.add(currentEntryKey.current);
    snapshots.current.forEach((_, key) => {
      if (!alive.has(key)) snapshots.current.delete(key);
    });
  };
  return { snapshots: snapshots.current, attach, prune };
}

export const StackLayout = ({
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
  bridge,
}: StackLayoutProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const effectiveDuration =
    transition === "none" || reducedMotion ? 0 : duration;
  const stackOptions = {
    duration: effectiveDuration,
    popStateTransition,
    keepAliveLimit,
  };

  const router = useRouter();
  const live = useNextRouterSnapshot(children);
  const path = snapshotPath(live);

  const [initialEntry] = useState(initialHistoryEntry);
  const [stack] = useState(() =>
    createRouterStack(
      { ...initialEntry, path, keepAlive: keepAlive?.(path) },
      stackOptions
    )
  );
  stack.setOptions(stackOptions);
  const { snapshots, attach, prune } = usePageSnapshots(live, initialEntry.key);
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  const syncedKey = useRef(initialEntry.key);
  // 라우터 컨텍스트가 바뀌어 다시 그려질 때마다 history 항목이 바뀌었는지 본다 (첫 실행에서 감싸기·key 부착)
  useLayoutEffect(() => {
    const entry = installHistoryEntries(initialEntry);
    if (entry.key === syncedKey.current) return;
    syncedKey.current = entry.key;
    stack.sync({
      key: entry.key,
      path,
      action: takeHistoryWrite(entry.key) ?? "pop",
      index: entry.index,
      keepAlive: keepAlive?.(path),
    });
    attach(stack.entryKeyFor(entry.key));
    rerender();
  });

  useEffect(() => stack.dispose, [stack]);

  const state = useSyncExternalStore(
    stack.subscribe,
    stack.getState,
    stack.getState
  );
  const actions = useStackActions(stack, router, onBackAtRoot);
  useRouterStackBridge(bridge, stack, actions, onBackAtRoot);
  const value = useMemo(() => toContextValue(state, actions), [state, actions]);

  const [layoutPages] = useState(createPageLayout);
  const pages = layoutPages(state, { maxMountedPages });
  const direction = state.transition?.type ?? "push";

  useEffect(() => {
    prune(new Set(pages.map((page) => page.entry.key)));
  });

  return (
    <StackContext.Provider value={value}>
      <div className="wvk-root" data-safe-area={safeArea ? "" : undefined}>
        <StackStyles />
        <div className="wvk-layout" style={{ maxWidth }}>
          <div className="wvk-pages">
            {pages.map((page) => {
              const { entry, pageState, mounted } = page;
              const snapshot = snapshots.get(entry.key);
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
                    <FrozenNextRouter snapshot={snapshot} />
                  ) : null}
                </StackPage>
              );
            })}
          </div>
        </div>
      </div>
    </StackContext.Provider>
  );
};
