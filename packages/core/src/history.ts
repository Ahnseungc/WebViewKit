import { BACK_TIMEOUT_MS } from "./constants";
import { HistoryAction, HistoryListener, HistoryState } from "./type";

type HistoryEntryState = Omit<HistoryState, "path" | "action">;

const isBrowser = () => typeof window !== "undefined";

const listeners = new Set<HistoryListener>();

const currentPath = () => window.location.pathname + window.location.search;

const onPopState = (event: PopStateEvent) => {
  const state: HistoryState = {
    path: currentPath(),
    ...((event.state as HistoryState | null) ?? {}),
    action: HistoryAction.POP,
  };
  listeners.forEach((listener) => listener(state));
};

/**
 * `window.history` 래퍼.
 * - 리스너는 브라우저 popstate(뒤로·앞으로·`go`)에서만 호출된다.
 * - push/replace 는 동기 실행이며 리스너를 호출하지 않는다 (호출자가 상태를 직접 갱신).
 * - popstate 구독은 첫 리스너 등록 시점에 건다 (import 부작용 없음).
 */
export const history = {
  push: (path: string, state: HistoryEntryState = {}) => {
    if (!isBrowser()) return;
    window.history.pushState(
      { ...state, path, action: HistoryAction.PUSH },
      "",
      path
    );
  },

  replace: (path: string, state: HistoryEntryState = {}) => {
    if (!isBrowser()) return;
    window.history.replaceState(
      { ...state, path, action: HistoryAction.REPLACE },
      "",
      path
    );
  },

  /** `history.go(delta)` 후 popstate 가 오면 true, BACK_TIMEOUT_MS 안에 오지 않으면 false */
  travel: (delta: number): Promise<boolean> => {
    if (!isBrowser()) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      const finish = (popped: boolean) => {
        window.clearTimeout(timer);
        window.removeEventListener("popstate", onPop);
        resolve(popped);
      };
      const onPop = () => finish(true);
      const timer = window.setTimeout(() => finish(false), BACK_TIMEOUT_MS);
      window.addEventListener("popstate", onPop);
      window.history.go(delta);
    });
  },

  back: (): Promise<boolean> => history.travel(-1),

  forward: () => {
    if (!isBrowser()) return;
    window.history.forward();
  },

  go: (delta: number) => {
    if (!isBrowser()) return;
    window.history.go(delta);
  },

  getCurrentState: (): HistoryState => {
    if (!isBrowser()) return { path: "/" };
    const state = window.history.state as HistoryState | null;
    return state?.path ? state : { path: currentPath() };
  },

  addListener: (listener: HistoryListener) => {
    if (!isBrowser()) return () => false;
    if (listeners.size === 0) {
      window.addEventListener("popstate", onPopState);
    }
    listeners.add(listener);
    return () => {
      const removed = listeners.delete(listener);
      if (listeners.size === 0) {
        window.removeEventListener("popstate", onPopState);
      }
      return removed;
    };
  },
};
