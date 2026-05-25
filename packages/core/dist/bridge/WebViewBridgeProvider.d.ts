import { type ReactNode } from "react";
import { type InstallBridgeHostOptions, type StackRouterHostHandlers } from "./host";
import { type CreateStackRouterBridgeOptions } from "./stack-router-bridge";
export type WebViewBridgeProviderProps = {
    children?: ReactNode;
    /** Native → web stack handlers (e.g. Next.js `router.push`) */
    stack?: StackRouterHostHandlers;
    transport?: CreateStackRouterBridgeOptions;
    /** Install `window.stackRouterBridge` for web → native */
    enableOutboundBridge?: boolean;
    hostOptions?: Omit<InstallBridgeHostOptions, "stack" | "exposeStackRouterBridge" | "legacyInboundHandlers">;
};
/**
 * Mount once near the app root (Next.js `layout`, SPA `App`).
 * Wires protocol ingress + optional legacy window stack handlers.
 */
export declare function WebViewBridgeProvider({ children, stack, transport, enableOutboundBridge, hostOptions, }: WebViewBridgeProviderProps): import("@emotion/react/jsx-runtime").JSX.Element;
//# sourceMappingURL=WebViewBridgeProvider.d.ts.map