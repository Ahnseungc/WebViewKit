import {
  TRANSITION_END_GRACE_MS,
  TRANSITION_START_TIMEOUT_MS,
} from "../constants";
import type { PopStateTransition } from "../type";
import {
  createStackState,
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
}

export interface RouterStackOptions {
  /** 0 이면 애니메이션 없이 즉시 전환 */
  duration: number;
  /** "none" 이면 back/forward 로 생긴 전환은 애니메이션 없이 즉시 반영 (기본 "animate") */
  popStateTransition?: PopStateTransition;
}

/**
 * 외부 라우터(React Router·Next·Nuxt 등)가 URL·history·데이터를 맡고,
 * 스택은 이동을 받아 전환·쌓임만 계산한다. history 는 건드리지 않는다.
 * 바인딩은 라우터 location 이 바뀔 때마다 `sync` 를 부르고, `createPageLayout` 결과를 그린다.
 */
export interface RouterStack {
  getState: () => StackState;
  subscribe: (listener: () => void) => () => void;
  setOptions: (options: RouterStackOptions) => void;
  sync: (location: RouterLocation) => void;
  endTransition: () => void;
  awaitTransitionStart: () => void;
  onTransitionStart: () => void;
  dispose: () => void;
}

const toEntry = ({ key, path }: Pick<RouterLocation, "key" | "path">) => ({
  key,
  path,
  pattern: path,
  params: {},
  query: {},
});

export function createRouterStack(
  initial: Omit<RouterLocation, "action">,
  initialOptions: RouterStackOptions
): RouterStack {
  let options = initialOptions;
  let state = createStackState(toEntry(initial));
  const listeners = new Set<() => void>();
  const indexByKey = new Map<string, number>();
  const remember = ({ key, index }: Omit<RouterLocation, "action">) => {
    if (index !== undefined) indexByKey.set(key, index);
  };
  remember(initial);

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

  const isBehindTop = (index: number | undefined) => {
    const { entries } = state;
    const topIndex = indexByKey.get(entries[entries.length - 1].key);
    return index !== undefined && topIndex !== undefined && index < topIndex;
  };

  const sync = (location: RouterLocation) => {
    const { key, path, action } = location;
    const { entries } = state;
    if (entries[entries.length - 1].key === key) return;
    const behindTop = isBehindTop(location.index);
    remember(location);
    const entry: StackEntry = toEntry({ key, path });
    if (action === "replace") {
      dispatch({ type: "REPLACE", entry });
      return;
    }
    if (action === "push") {
      dispatch({ type: "PUSH", entry, animate: animate() });
      return;
    }
    // pop: 스택 안 key 면 뒤로, 스택 바닥 아래(딥링크 뒤 back)면 새 바닥으로, 나머지는 앞으로 가기
    const index = entries.findIndex((item) => item.key === key);
    if (index !== -1) {
      dispatch({ type: "POP_TO", index, animate: animatePop() });
      return;
    }
    if (behindTop) {
      dispatch({
        type: "REVIVE",
        entry,
        direction: "pop",
        index: 0,
        animate: animatePop(),
      });
      return;
    }
    dispatch({ type: "PUSH", entry, animate: animatePop() });
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
