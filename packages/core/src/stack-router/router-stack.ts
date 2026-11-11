import {
  KEEP_ALIVE_LIMIT,
  TRANSITION_END_GRACE_MS,
  TRANSITION_START_TIMEOUT_MS,
} from "../constants";
import type { PopStateTransition } from "../type";
import {
  createStackState,
  findRevivable,
  type StackAction,
  type StackEntry,
  stackReducer,
  type StackState,
} from "./stack-reducer";

/** 외부 라우터가 알려 주는 이동. key 는 history 항목마다 고유해야 한다 */
export interface RouterLocation {
  key: string;
  path: string;
  action: "push" | "replace" | "pop";
  /** history 위치 (React Router 의 `history.state.idx` 등). 있으면 스택 밖 back 방향을 가린다 */
  index?: number;
  /** true 면 스택에서 빠져도 보관하고, 같은 path 로 다시 오면 그 인스턴스를 되살린다 */
  keepAlive?: boolean;
}

export interface RouterStackOptions {
  /** 0 이면 애니메이션 없이 즉시 전환 */
  duration: number;
  /** "none" 이면 back/forward 로 생긴 전환은 애니메이션 없이 즉시 반영 (기본 "animate") */
  popStateTransition?: PopStateTransition;
  /** keepAlive 페이지 최대 보관 수. 0 이면 보관·되살리기 안 함 (생성 시 1회만 읽는다) */
  keepAliveLimit?: number;
}

/**
 * 외부 라우터(React Router·Next·Nuxt·SvelteKit 등)가 URL·history·데이터를 맡고,
 * 스택은 이동을 받아 전환·쌓임만 계산한다. history 는 건드리지 않는다.
 * 바인딩은 라우터 location 이 바뀔 때마다 `sync` 를 부르고, `createPageLayout` 결과를 그린다.
 * 페이지 화면은 `entryKeyFor(location.key)` 로 보관한다 (keepAlive 로 되살리면 예전 key 를 쓴다).
 */
export interface RouterStack {
  getState: () => StackState;
  subscribe: (listener: () => void) => () => void;
  setOptions: (options: RouterStackOptions) => void;
  sync: (location: RouterLocation) => void;
  /** 라우터 location key → 그 화면을 그리는 스택 엔트리 key */
  entryKeyFor: (locationKey: string) => string;
  /** 다음 sync 를 스택 초기화로 처리한다 (replace 이동과 함께 쓴다) */
  expectReset: () => void;
  endTransition: () => void;
  awaitTransitionStart: () => void;
  onTransitionStart: () => void;
  dispose: () => void;
}

const toEntry = (
  { key, path, keepAlive }: Omit<RouterLocation, "action">,
  cacheLimit: number
): StackEntry => ({
  key,
  path,
  pattern: path,
  params: {},
  query: {},
  keepAlive: keepAlive === true && cacheLimit > 0,
});

export function createRouterStack(
  initial: Omit<RouterLocation, "action">,
  initialOptions: RouterStackOptions
): RouterStack {
  let options = initialOptions;
  const cacheLimit = options.keepAliveLimit ?? KEEP_ALIVE_LIMIT;
  let state = createStackState(toEntry(initial, cacheLimit), cacheLimit);
  const listeners = new Set<() => void>();
  // 되살린 화면은 새 location key 로 와도 예전 엔트리 key 로 그린다
  const aliases = new Map<string, string>();
  const entryKeyFor = (locationKey: string) =>
    aliases.get(locationKey) ?? locationKey;
  const indexByKey = new Map<string, number>();
  const rememberIndex = (entryKey: string, index: number | undefined) => {
    if (index !== undefined) indexByKey.set(entryKey, index);
  };
  rememberIndex(initial.key, initial.index);
  let resetPending = false;

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
      clearTimeout(transitionTimer);
    }
    listeners.forEach((listener) => listener());
  };

  const animate = () => options.duration > 0;
  const animatePop = () => options.popStateTransition !== "none" && animate();
  const topKey = () => state.entries[state.entries.length - 1].key;

  const isBehindTop = (index: number | undefined) => {
    const topIndex = indexByKey.get(topKey());
    return index !== undefined && topIndex !== undefined && index < topIndex;
  };

  /**
   * keepAlive 보관본을 같은 path 로 찾아 location key 를 잇는다.
   * 외부 라우터는 전환 중에도 이동하므로, 아직 퇴장 애니메이션 중(leaving)인 keepAlive 도 본다
   */
  const reviveFor = (location: RouterLocation) => {
    if (!location.keepAlive) return undefined;
    const leaving = [...state.leaving]
      .reverse()
      .find((entry) => entry.keepAlive && entry.path === location.path);
    const revived = findRevivable(state, location.path) ?? leaving;
    if (revived) aliases.set(location.key, revived.key);
    return revived;
  };

  const syncPush = (location: RouterLocation, entry: StackEntry) => {
    const revived = reviveFor(location);
    if (!revived) {
      dispatch({ type: "PUSH", entry, animate: animate() });
      return;
    }
    dispatch({
      type: "REVIVE",
      entry: revived,
      direction: "push",
      index: state.entries.length,
      animate: animate(),
    });
  };

  // 스택 안 key 면 뒤로, 스택 바닥 아래(딥링크 뒤 back)면 새 바닥으로, 나머지는 앞으로 가기
  const syncPop = (entry: StackEntry, behindTop: boolean) => {
    const index = state.entries.findIndex((item) => item.key === entry.key);
    if (index !== -1) {
      dispatch({ type: "POP_TO", index, animate: animatePop() });
      return;
    }
    const cached = state.cached.find((item) => item.key === entry.key);
    dispatch({
      type: "REVIVE",
      entry: cached ?? entry,
      direction: behindTop ? "pop" : "push",
      index: behindTop ? 0 : state.entries.length,
      animate: animatePop(),
    });
  };

  const sync = (location: RouterLocation) => {
    const entryKey = entryKeyFor(location.key);
    if (topKey() === entryKey) return;
    const behindTop = isBehindTop(location.index);
    const entry = toEntry({ ...location, key: entryKey }, state.cacheLimit);
    if (resetPending) {
      resetPending = false;
      dispatch({ type: "RESET", entry });
    } else if (location.action === "replace") {
      dispatch({ type: "REPLACE", entry });
    } else if (location.action === "push") {
      syncPush(location, entry);
    } else {
      syncPop(entry, behindTop);
    }
    rememberIndex(entryKeyFor(location.key), location.index);
  };

  function endTransition() {
    dispatch({ type: "END_TRANSITION" });
  }

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
    sync,
    entryKeyFor,
    expectReset: () => {
      resetPending = true;
    },
    endTransition,
    awaitTransitionStart: () => {
      if (state.transition) {
        armTransitionTimer(options.duration + TRANSITION_START_TIMEOUT_MS);
      }
    },
    onTransitionStart: () => {
      if (state.transition) {
        armTransitionTimer(options.duration + TRANSITION_END_GRACE_MS);
      }
    },
    dispose: () => clearTimeout(transitionTimer),
  };
}
