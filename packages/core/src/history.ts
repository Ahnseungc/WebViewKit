import { HistoryAction, HistoryListener, HistoryState } from "./type";
import { STACK_TRANSITION_MS } from "./constants";

const isBrowser = typeof window !== "undefined";

const listeners = new Set<HistoryListener>();

const notifyListeners = (state: HistoryState) => {
  listeners.forEach((listener) => listener(state));
};

if (isBrowser) {
  window.addEventListener("popstate", (event: PopStateEvent) => {
    const state = event.state as HistoryState;
    notifyListeners(state);
  });
}

const delay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, STACK_TRANSITION_MS * 0.6));

export const history = {
  push: async (path: string, data?: unknown) => {
    if (!isBrowser) return;
    const state: HistoryState = {
      path,
      data,
      action: HistoryAction.PUSH,
    };
    window.history.pushState(state, "", path);
    await delay();
    notifyListeners(state);
  },

  replace: async (path: string, data?: unknown) => {
    if (!isBrowser) return;
    const state: HistoryState = {
      path,
      data,
      action: HistoryAction.REPLACE,
    };
    window.history.replaceState(state, "", path);
    await delay();
    notifyListeners(state);
  },

  back: async () => {
    if (!isBrowser) return;
    window.history.back();

    await new Promise<void>((resolve) => {
      const onPop = () => {
        window.removeEventListener("popstate", onPop);
        resolve();
      };
      window.addEventListener("popstate", onPop);
    });

    notifyListeners({
      path: window.location.pathname,
      action: HistoryAction.POP,
    });
  },

  forward: async () => {
    if (!isBrowser) return;
    window.history.forward();
    await delay();
    notifyListeners({
      path: window.location.pathname,
      action: HistoryAction.PUSH,
    });
  },

  go: async (delta: number) => {
    if (!isBrowser) return;
    window.history.go(delta);
    await delay();
    notifyListeners({
      path: window.location.pathname,
      action: HistoryAction.PUSH,
    });
  },

  getCurrentState: (): HistoryState => {
    if (!isBrowser) {
      return { path: "/" };
    }
    return (
      (window.history.state as HistoryState) || {
        path: window.location.pathname,
      }
    );
  },

  addListener: (listener: HistoryListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
