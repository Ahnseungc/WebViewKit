import { HistoryAction, HistoryListener, HistoryState } from "./type";

const listeners = new Set<HistoryListener>();

const handlePopState = (event: PopStateEvent) => {
  const state = event.state as HistoryState;
  notifyListeners(state);
};

// notify to listeners
const notifyListeners = (state: HistoryState) => {
  listeners.forEach((listener) => listener(state));
};

// initialize
window.addEventListener("popstate", handlePopState);

export const history = {
  // add new history entry
  push: async (path: string, data?: any) => {
    const state: HistoryState = {
      path,
      data,
      action: HistoryAction.PUSH,
    };
    window.history.pushState(state, "", path);
    // 애니메이션을 위한 지연
    await new Promise((resolve) => setTimeout(resolve, 300));
    notifyListeners(state);
  },

  // replace current history entry
  replace: async (path: string, data: any) => {
    const state: HistoryState = {
      path,
      data,
      action: HistoryAction.REPLACE,
    };
    window.history.replaceState(state, "", path);
    await new Promise((resolve) => setTimeout(resolve, 300));
    notifyListeners(state);
  },

  // back to previous history entry
  back: async () => {
    window.history.back();

    await new Promise<void>((resolve) => {
      const handlePopState = () => {
        window.removeEventListener("popstate", handlePopState);
        resolve();
      };
      window.addEventListener("popstate", handlePopState);
    });

    const state: HistoryState = {
      path: window.location.pathname,
      action: HistoryAction.POP,
    };
    notifyListeners(state);
  },

  // forward to next history entry
  forward: async () => {
    window.history.forward();
    const state: HistoryState = {
      path: window.location.pathname,
      action: HistoryAction.PUSH,
    };
    await new Promise((resolve) => setTimeout(resolve, 300));
    notifyListeners(state);
  },

  // go to specific history entry
  go: async (delta: number) => {
    window.history.go(delta);
    const state: HistoryState = {
      path: window.location.pathname,
      action: HistoryAction.PUSH,
    };
    await new Promise((resolve) => setTimeout(resolve, 300));
    notifyListeners(state);
  },

  // get current history entry
  getCurrentState: (): HistoryState =>
    (window.history.state as HistoryState) || {
      path: window.location.pathname,
    },

  // change listener to history
  addListener: (listener: HistoryListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
