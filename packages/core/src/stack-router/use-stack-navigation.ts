import { useCallback, useEffect, useReducer, useRef } from "react";
import { createBridgeId } from "../bridge/protocol";
import { TRANSITION_END_GRACE_MS } from "../constants";
import { history } from "../history";
import type { Activity, HistoryState, RestoreStackPolicy } from "../type";
import { findActivity, type PathMatch } from "./match-path";
import {
  createStackState,
  type StackEntry,
  stackReducer,
  type StackState,
} from "./stack-reducer";

export interface StackNavigationOptions {
  initialActivity: Activity;
  activities: Activity[];
  /** 0 이면 애니메이션 없이 즉시 전환 */
  duration: number;
  restoreStack: RestoreStackPolicy;
  onBackAtRoot?: () => void;
  onNotFound?: (path: string) => void;
}

export interface StackNavigation {
  state: StackState;
  push: (path: string, data?: unknown) => boolean;
  replace: (path: string, data?: unknown) => boolean;
  reset: (path: string, data?: unknown) => boolean;
  resetPush: (path: string, data?: unknown) => boolean;
  back: () => boolean;
  pop: (count?: number) => boolean;
  popTo: (path: string) => boolean;
  endTransition: () => void;
}

const isDev = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

function createEntry(
  hit: { activity: Activity; match: PathMatch },
  path: string,
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
  };
}

const currentUrl = () => window.location.pathname + window.location.search;

/** 스택 상태 + 내비게이션. 모든 브라우저 이동(back/forward)은 popstate 한 경로로 처리 */
export function useStackNavigation(
  options: StackNavigationOptions
): StackNavigation {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [state, dispatch] = useReducer(stackReducer, undefined, () => {
    const { initialActivity } = options;
    return createStackState(
      createEntry(
        { activity: initialActivity, match: { params: {}, query: {} } },
        initialActivity.path
      )
    );
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  // 전환 중 입력 잠금 (같은 tick 연타까지 막기 위해 ref)
  const busyRef = useRef(false);

  const resolve = useCallback((path: string) => {
    const { activities, initialActivity } = optionsRef.current;
    return findActivity([...activities, initialActivity], path);
  }, []);

  const resolveOrNotify = useCallback(
    (path: string) => {
      const hit = resolve(path);
      if (!hit) {
        if (isDev()) {
          console.warn(`[webviewkit] No activity matches "${path}"`);
        }
        optionsRef.current.onNotFound?.(path);
      }
      return hit;
    },
    [resolve]
  );

  const animate = () => optionsRef.current.duration > 0;

  const push = useCallback(
    (path: string, data?: unknown) => {
      if (busyRef.current) return false;
      const hit = resolveOrNotify(path);
      if (!hit) return false;
      const entry = createEntry(hit, path, data);
      busyRef.current = true;
      history.push(path, {
        key: entry.key,
        index: stateRef.current.entries.length,
        data,
      });
      dispatch({ type: "PUSH", entry, animate: animate() });
      return true;
    },
    [resolveOrNotify]
  );

  const replace = useCallback(
    (path: string, data?: unknown) => {
      if (busyRef.current) return false;
      const hit = resolveOrNotify(path);
      if (!hit) return false;
      const entry = createEntry(hit, path, data);
      history.replace(path, {
        key: entry.key,
        index: stateRef.current.entries.length - 1,
        data,
      });
      dispatch({ type: "REPLACE", entry });
      return true;
    },
    [resolveOrNotify]
  );

  const reset = useCallback(
    (path: string, data?: unknown) => {
      if (busyRef.current) return false;
      const hit = resolveOrNotify(path);
      if (!hit) return false;
      const entry = createEntry(hit, path, data);
      history.replace(path, { key: entry.key, index: 0, data });
      dispatch({ type: "RESET", entry });
      return true;
    },
    [resolveOrNotify]
  );

  // resetPush 가 history 를 루트로 되감을 때 오는 popstate 는 스택에 반영하지 않는다
  const ignorePopRef = useRef(0);

  const resetPush = useCallback(
    (path: string, data?: unknown) => {
      const { entries } = stateRef.current;
      if (entries.length === 1) return push(path, data);
      if (busyRef.current) return false;
      const hit = resolveOrNotify(path);
      if (!hit) return false;
      const entry = createEntry(hit, path, data);
      busyRef.current = true;
      dispatch({ type: "RESET_PUSH", entry, animate: animate() });
      // 루트로 되감은 뒤 push 해야 앞으로 가기 기록까지 정리된다
      ignorePopRef.current += 1;
      void history.travel(-(entries.length - 1)).then((popped) => {
        if (!popped) ignorePopRef.current = 0;
        history.push(path, { key: entry.key, index: 1, data });
      });
      return true;
    },
    [push, resolveOrNotify]
  );

  const pop = useCallback((count: number = 1) => {
    if (busyRef.current) return false;
    const { entries } = stateRef.current;
    if (entries.length <= 1) {
      optionsRef.current.onBackAtRoot?.();
      return false;
    }
    const delta = Math.min(Math.max(1, count), entries.length - 1);
    const targetIndex = entries.length - 1 - delta;
    busyRef.current = true;
    // push 와 같이 클릭 tick 에서 바로 전환을 시작한다. popstate 를 기다리면
    // 브라우저가 history traversal 동안 프레임을 늦춰 애니메이션이 시작되지 않는다.
    // 뒤따르는 popstate 는 key 가 이미 top 이라 onPop 에서 no-op 이 된다.
    dispatch({ type: "POP_TO", index: targetIndex, animate: animate() });
    void history.travel(-delta);
    return true;
  }, []);

  const back = useCallback(() => pop(1), [pop]);

  const popTo = useCallback(
    (path: string) => {
      const { entries } = stateRef.current;
      for (let i = entries.length - 2; i >= 0; i -= 1) {
        if (entries[i].path === path || entries[i].pattern === path) {
          return pop(entries.length - 1 - i);
        }
      }
      return false;
    },
    [pop]
  );

  const endTransition = useCallback(() => {
    dispatch({ type: "END_TRANSITION" });
  }, []);

  // popstate (브라우저·하드웨어 back, forward, history.go)
  useEffect(() => {
    const onPop = (historyState: HistoryState) => {
      if (ignorePopRef.current > 0) {
        ignorePopRef.current -= 1;
        return;
      }
      const { entries } = stateRef.current;
      const index = historyState.key
        ? entries.findIndex((entry) => entry.key === historyState.key)
        : -1;
      if (index !== -1) {
        if (index < entries.length - 1) {
          busyRef.current = true;
          dispatch({ type: "POP_TO", index, animate: animate() });
        }
        return;
      }
      const hit = resolveOrNotify(historyState.path);
      if (!hit) {
        busyRef.current = false;
        return;
      }
      const entry = createEntry(
        hit,
        historyState.path,
        historyState.data,
        historyState.key
      );
      if (
        typeof historyState.index === "number" &&
        historyState.index === entries.length
      ) {
        busyRef.current = true;
        dispatch({ type: "PUSH", entry, animate: animate() });
        return;
      }
      dispatch({ type: "RESET", entry });
    };
    const removeListener = history.addListener(onPop);
    return () => {
      removeListener();
    };
  }, [resolveOrNotify]);

  // 새로고침·딥링크 복원 (마운트 1회, StrictMode 재실행 방지)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const root = stateRef.current.entries[0];
    const url = currentUrl();
    const hit = url === root.path ? null : resolve(url);
    if (!hit || hit.activity === optionsRef.current.initialActivity) {
      history.replace(root.path, { key: root.key, index: 0 });
      return;
    }

    const savedData = (history.getCurrentState() as HistoryState).data;
    const top = createEntry(hit, url, savedData);
    if (optionsRef.current.restoreStack === "top-only") {
      history.replace(url, { key: top.key, index: 0, data: savedData });
      dispatch({ type: "RESTORE", entries: [top] });
      return;
    }
    history.replace(root.path, { key: root.key, index: 0 });
    history.push(url, { key: top.key, index: 1, data: savedData });
    dispatch({ type: "RESTORE", entries: [root, top] });
  }, [resolve]);

  // 전환 종료 안전 타이머 (animationend 누락·jsdom 대비)
  useEffect(() => {
    if (!state.transition) {
      busyRef.current = false;
      return;
    }
    const timer = setTimeout(
      endTransition,
      optionsRef.current.duration + TRANSITION_END_GRACE_MS
    );
    return () => clearTimeout(timer);
  }, [state, endTransition]);

  return {
    state,
    push,
    replace,
    reset,
    resetPush,
    back,
    pop,
    popTo,
    endTransition,
  };
}
