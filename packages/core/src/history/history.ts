export interface HistoryState {
  path: string;
  data?: any;
}

type HistoryListener = (state: HistoryState) => void;

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
  push: (path: string, data?: any) => {
    const state: HistoryState = {
      path,
      data,
    };
    window.history.pushState(state, "", path);
    notifyListeners(state);
  },

  // replace current history entry
  replace: (path: string, data: any) => {
    const state: HistoryState = {
      path,
      data,
    };
    window.history.replaceState(state, "", path);
    notifyListeners(state);
  },

  // back to previous history entry
  back: () => {
    window.history.back();
  },

  // forward to next history entry
  forward: () => {
    window.history.forward();
  },

  // go to specific history entry
  go: (delta: number) => {
    window.history.go(delta);
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
