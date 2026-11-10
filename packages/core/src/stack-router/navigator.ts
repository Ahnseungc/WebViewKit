import { createBridgeId } from "../bridge/protocol";
import {
  KEEP_ALIVE_LIMIT,
  TRANSITION_END_GRACE_MS,
  TRANSITION_START_TIMEOUT_MS,
} from "../constants";
import { history } from "../history";
import type {
  ActivityRoute,
  HistoryState,
  PopStateTransition,
  RestoreStackPolicy,
} from "../type";
import { findActivity, type PathMatch } from "./match-path";
import {
  createStackState,
  findRevivable,
  type StackAction,
  type StackEntry,
  stackReducer,
  type StackState,
} from "./stack-reducer";

export interface StackNavigatorOptions<
  A extends ActivityRoute = ActivityRoute,
> {
  initialActivity: A;
  activities: A[];
  /** 0 이면 애니메이션 없이 즉시 전환 */
  duration: number;
  /** "none" 이면 popstate 로 생긴 전환은 애니메이션 없이 즉시 반영 (기본 "animate") */
  popStateTransition?: PopStateTransition;
  restoreStack: RestoreStackPolicy;
  /** keepAlive 페이지 최대 보관 수. 0 이면 보관·되살리기 안 함 (생성 시 1회만 읽는다) */
  keepAliveLimit: number;
  onBackAtRoot?: () => void;
  onNotFound?: (path: string) => void;
}

export interface StackNavigatorActions {
  push: (path: string, data?: unknown) => boolean;
  replace: (path: string, data?: unknown) => boolean;
  reset: (path: string, data?: unknown) => boolean;
  resetPush: (path: string, data?: unknown) => boolean;
  back: () => boolean;
  pop: (count?: number) => boolean;
  popTo: (path: string) => boolean;
  endTransition: () => void;
  /** 들어오는 페이지에 시작 대기 중인 CSS 애니메이션이 있다 (커밋 중, 안전 타이머를 길게) */
  awaitTransitionStart: () => void;
  /** 들어오는 페이지의 CSS 애니메이션이 시작됐다 (안전 타이머를 지금부터 다시 잰다) */
  onTransitionStart: () => void;
}

/**
 * 프레임워크와 무관한 스택 상태 + 내비게이션.
 * 바인딩은 `subscribe`/`getState` 로 그리고, 마운트 시 `start()`, 언마운트 시 그 반환값을 호출한다
 */
export interface StackNavigator<A extends ActivityRoute = ActivityRoute>
  extends StackNavigatorActions {
  getState: () => StackState;
  subscribe: (listener: () => void) => () => void;
  /** 최신 옵션 반영 (렌더마다 불러도 된다) */
  setOptions: (options: StackNavigatorOptions<A>) => void;
  /** popstate 구독 + 새로고침·딥링크 복원(최초 1회). 반환값은 정리 함수 */
  start: () => () => void;
}

const isDev = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

/** cacheLimit 이 0 이면 keepAlive 라우트도 일반 엔트리로 만든다 (기능 끔) */
function createEntry(
  hit: { activity: ActivityRoute; match: PathMatch },
  path: string,
  cacheLimit: number,
  data?: unknown,
  key: string = createBridgeId()
): StackEntry {
  return {
    key,
    path,
    pattern: hit.activity.path,
    params: hit.match.params,
    query: hit.match.query,
    data,
    keepAlive: hit.activity.keepAlive === true && cacheLimit > 0,
  };
}

const currentUrl = () => window.location.pathname + window.location.search;

/** 모든 브라우저 이동(back/forward)은 popstate 한 경로로 처리 */
export function createStackNavigator<A extends ActivityRoute>(
  initialOptions: StackNavigatorOptions<A>
): StackNavigator<A> {
  let options = initialOptions;
  const cacheLimit = options.keepAliveLimit ?? KEEP_ALIVE_LIMIT;
  let state = createStackState(
    createEntry(
      {
        activity: options.initialActivity,
        match: { params: {}, query: {} },
      },
      options.initialActivity.path,
      cacheLimit
    ),
    cacheLimit
  );
  const listeners = new Set<() => void>();

  const newEntry = (
    hit: { activity: ActivityRoute; match: PathMatch },
    path: string,
    data?: unknown,
    key?: string
  ) => createEntry(hit, path, state.cacheLimit, data, key);

  // 전환 중 입력 잠금 (같은 tick 연타까지 막는다)
  let busy = false;
  // 루트로 되감을 때(reset·resetPush) 오는 popstate 는 스택에 반영하지 않는다
  let ignorePop = 0;
  // history.go 가 끝나기 전 다른 history 조작이 끼면 스택과 URL 이 어긋나므로 잠근다
  let pendingTravel = 0;
  const isLocked = () => busy || pendingTravel > 0;

  // 전환 종료 안전 타이머 (animationend 누락·jsdom 대비).
  // 바인딩이 시작 대기 중인 애니메이션을 알리면 길게 두고, animationstart 에서 다시 잰다
  let transitionTimer: ReturnType<typeof setTimeout> | undefined;
  const armTransitionTimer = (delay: number) => {
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(endTransition, delay);
  };

  const dispatch = (action: StackAction) => {
    const next = stackReducer(state, action);
    if (next === state) return;
    state = next;
    if (state.transition) {
      armTransitionTimer(options.duration + TRANSITION_END_GRACE_MS);
    } else {
      busy = false;
      clearTimeout(transitionTimer);
    }
    listeners.forEach((listener) => listener());
  };

  const travel = (delta: number, ignore: boolean) => {
    pendingTravel += 1;
    if (ignore) ignorePop += 1;
    return history.travel(delta).then((popped) => {
      pendingTravel -= 1;
      if (!popped && ignore) ignorePop = Math.max(0, ignorePop - 1);
      return popped;
    });
  };

  const resolve = (path: string) =>
    findActivity([...options.activities, options.initialActivity], path);

  const resolveOrNotify = (path: string) => {
    const hit = resolve(path);
    if (!hit) {
      if (isDev()) console.warn(`[webviewkit] No activity matches "${path}"`);
      options.onNotFound?.(path);
    }
    return hit;
  };

  const animate = () => options.duration > 0;
  // pop() 은 popstate 전에 dispatch 하므로 여기 오지 않는다 (뒤따르는 popstate 는 no-op)
  const animatePopState = () =>
    options.popStateTransition !== "none" && animate();

  const push = (path: string, data?: unknown) => {
    if (isLocked()) return false;
    const hit = resolveOrNotify(path);
    if (!hit) return false;
    const { entries } = state;
    const revived = findRevivable(state, path);
    const entry = revived ? { ...revived, data } : newEntry(hit, path, data);
    busy = true;
    history.push(path, { key: entry.key, index: entries.length, data });
    dispatch(
      revived
        ? {
            type: "REVIVE",
            entry,
            direction: "push",
            index: entries.length,
            animate: animate(),
          }
        : { type: "PUSH", entry, animate: animate() }
    );
    return true;
  };

  const replace = (path: string, data?: unknown) => {
    if (isLocked()) return false;
    const hit = resolveOrNotify(path);
    if (!hit) return false;
    const entry = newEntry(hit, path, data);
    history.replace(path, {
      key: entry.key,
      index: state.entries.length - 1,
      data,
    });
    dispatch({ type: "REPLACE", entry });
    return true;
  };

  const reset = (path: string, data?: unknown) => {
    if (isLocked()) return false;
    const hit = resolveOrNotify(path);
    if (!hit) return false;
    const entry = newEntry(hit, path, data);
    const depth = state.entries.length;
    dispatch({ type: "RESET", entry });
    // 현재 항목만 replace 하면 지운 페이지들이 history 에 남아 브라우저 back 으로 되살아난다
    const commit = () => {
      history.replace(path, { key: entry.key, index: 0, data });
    };
    if (depth === 1) commit();
    else void travel(-(depth - 1), true).then(commit);
    return true;
  };

  const resetPush = (path: string, data?: unknown) => {
    const { entries } = state;
    if (entries.length === 1) return push(path, data);
    if (isLocked()) return false;
    const hit = resolveOrNotify(path);
    if (!hit) return false;
    const revivable = findRevivable(state, path, { includeRemovable: true });
    const entry = revivable
      ? { ...revivable, data }
      : newEntry(hit, path, data);
    busy = true;
    dispatch({ type: "RESET_PUSH", entry, animate: animate() });
    // 루트로 되감은 뒤 push 해야 앞으로 가기 기록까지 정리된다
    void travel(-(entries.length - 1), true).then(() => {
      history.push(path, { key: entry.key, index: 1, data });
    });
    return true;
  };

  const pop = (count: number = 1) => {
    if (isLocked()) return false;
    const { entries } = state;
    if (entries.length <= 1) {
      options.onBackAtRoot?.();
      return false;
    }
    const delta = Math.min(Math.max(1, count), entries.length - 1);
    const targetIndex = entries.length - 1 - delta;
    busy = true;
    // push 와 같이 클릭 tick 에서 바로 전환을 시작한다. popstate 를 기다리면
    // 브라우저가 history traversal 동안 프레임을 늦춰 애니메이션이 시작되지 않는다.
    // 뒤따르는 popstate 는 key 가 이미 top 이라 onPop 에서 no-op 이 된다.
    dispatch({ type: "POP_TO", index: targetIndex, animate: animate() });
    void travel(-delta, false);
    return true;
  };

  const back = () => pop(1);

  const popTo = (path: string) => {
    const { entries } = state;
    for (let i = entries.length - 2; i >= 0; i -= 1) {
      if (entries[i].path === path || entries[i].pattern === path) {
        return pop(entries.length - 1 - i);
      }
    }
    return false;
  };

  function endTransition() {
    dispatch({ type: "END_TRANSITION" });
  }

  const awaitTransitionStart = () => {
    if (!state.transition) return;
    armTransitionTimer(options.duration + TRANSITION_START_TIMEOUT_MS);
  };

  const onTransitionStart = () => {
    if (!state.transition) return;
    armTransitionTimer(options.duration + TRANSITION_END_GRACE_MS);
  };

  // popstate (브라우저·하드웨어 back, forward, history.go)
  const onPop = (historyState: HistoryState) => {
    if (ignorePop > 0) {
      ignorePop -= 1;
      return;
    }
    const { entries } = state;
    const index = historyState.key
      ? entries.findIndex((entry) => entry.key === historyState.key)
      : -1;
    if (index !== -1) {
      if (index < entries.length - 1) {
        busy = true;
        dispatch({ type: "POP_TO", index, animate: animatePopState() });
      }
      return;
    }
    const cachedEntry = historyState.key
      ? state.cached.find((item) => item.key === historyState.key)
      : undefined;
    const targetIndex = historyState.index;
    if (
      cachedEntry &&
      typeof targetIndex === "number" &&
      // 루트 자리(0)는 되살리지 않는다. 아래 일반 처리(reset)로 넘긴다
      targetIndex >= 1 &&
      targetIndex <= entries.length
    ) {
      busy = true;
      dispatch({
        type: "REVIVE",
        entry: { ...cachedEntry, data: historyState.data },
        direction: targetIndex === entries.length ? "push" : "pop",
        index: targetIndex,
        animate: animatePopState(),
      });
      return;
    }
    const hit = resolveOrNotify(historyState.path);
    if (!hit) {
      busy = false;
      return;
    }
    const entry = newEntry(
      hit,
      historyState.path,
      historyState.data,
      historyState.key
    );
    if (
      typeof historyState.index === "number" &&
      historyState.index === entries.length
    ) {
      busy = true;
      dispatch({ type: "PUSH", entry, animate: animatePopState() });
      return;
    }
    dispatch({ type: "RESET", entry });
  };

  // 새로고침·딥링크 복원 (최초 1회, StrictMode 재실행 방지)
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;

    const root = state.entries[0];
    const url = currentUrl();
    const hit = url === root.path ? null : resolve(url);
    if (!hit || hit.activity === options.initialActivity) {
      history.replace(root.path, { key: root.key, index: 0 });
      return;
    }

    const savedData = (history.getCurrentState() as HistoryState).data;
    const top = newEntry(hit, url, savedData);
    if (options.restoreStack === "top-only") {
      history.replace(url, { key: top.key, index: 0, data: savedData });
      dispatch({ type: "RESTORE", entries: [top] });
      return;
    }
    history.replace(root.path, { key: root.key, index: 0 });
    history.push(url, { key: top.key, index: 1, data: savedData });
    dispatch({ type: "RESTORE", entries: [root, top] });
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOptions: (next) => {
      options = next;
    },
    start: () => {
      const removeListener = history.addListener(onPop);
      restore();
      return () => {
        removeListener();
        clearTimeout(transitionTimer);
      };
    },
    push,
    replace,
    reset,
    resetPush,
    back,
    pop,
    popTo,
    endTransition,
    awaitTransitionStart,
    onTransitionStart,
  };
}
