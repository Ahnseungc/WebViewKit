"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.history = void 0;
const type_1 = require("./type");
const constants_1 = require("./constants");
const isBrowser = typeof window !== "undefined";
const listeners = new Set();
const notifyListeners = (state) => {
    listeners.forEach((listener) => listener(state));
};
if (isBrowser) {
    window.addEventListener("popstate", (event) => {
        const state = event.state;
        notifyListeners(state);
    });
}
const delay = () => new Promise((resolve) => setTimeout(resolve, constants_1.STACK_TRANSITION_MS * 0.6));
exports.history = {
    push: async (path, data) => {
        if (!isBrowser)
            return;
        const state = {
            path,
            data,
            action: type_1.HistoryAction.PUSH,
        };
        window.history.pushState(state, "", path);
        await delay();
        notifyListeners(state);
    },
    replace: async (path, data) => {
        if (!isBrowser)
            return;
        const state = {
            path,
            data,
            action: type_1.HistoryAction.REPLACE,
        };
        window.history.replaceState(state, "", path);
        await delay();
        notifyListeners(state);
    },
    back: async () => {
        if (!isBrowser)
            return;
        window.history.back();
        await new Promise((resolve) => {
            const onPop = () => {
                window.removeEventListener("popstate", onPop);
                resolve();
            };
            window.addEventListener("popstate", onPop);
        });
        notifyListeners({
            path: window.location.pathname,
            action: type_1.HistoryAction.POP,
        });
    },
    forward: async () => {
        if (!isBrowser)
            return;
        window.history.forward();
        await delay();
        notifyListeners({
            path: window.location.pathname,
            action: type_1.HistoryAction.PUSH,
        });
    },
    go: async (delta) => {
        if (!isBrowser)
            return;
        window.history.go(delta);
        await delay();
        notifyListeners({
            path: window.location.pathname,
            action: type_1.HistoryAction.PUSH,
        });
    },
    getCurrentState: () => {
        if (!isBrowser) {
            return { path: "/" };
        }
        return (window.history.state || {
            path: window.location.pathname,
        });
    },
    addListener: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};
