import React from "react";
import { HistoryState, StackRouterProviderProps } from "../type";
interface StackRouterContextProps {
    currentPath: string;
    currentState: HistoryState;
    Activities: {
        path: string;
        element: React.ReactNode;
    }[];
    initialActivity: {
        path: string;
        element: React.ReactNode;
    };
    push: (path: string, data?: any) => void;
    replace: (path: string, data?: any) => void;
    back: () => void;
    forward: () => void;
    visiblePages: {
        path: string;
        element: React.ReactNode;
    }[];
}
export declare const useStackRouter: () => StackRouterContextProps;
declare const StackRouterProvider: ({ maxWidth, Activities, initialActivity, enableDevTools, }: StackRouterProviderProps) => import("@emotion/react/jsx-runtime").JSX.Element;
export default StackRouterProvider;
export { StackRouterProvider };
//# sourceMappingURL=stack-router-provider.d.ts.map