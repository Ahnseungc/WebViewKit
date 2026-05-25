import { HistoryListener, HistoryState } from "./type";
export declare const history: {
    push: (path: string, data?: unknown) => Promise<void>;
    replace: (path: string, data?: unknown) => Promise<void>;
    back: () => Promise<void>;
    forward: () => Promise<void>;
    go: (delta: number) => Promise<void>;
    getCurrentState: () => HistoryState;
    addListener: (listener: HistoryListener) => () => boolean;
};
//# sourceMappingURL=history.d.ts.map