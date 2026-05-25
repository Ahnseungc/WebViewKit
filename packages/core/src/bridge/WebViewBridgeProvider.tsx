import { useEffect, type ReactNode } from "react";
import {
  installBridgeHost,
  type InstallBridgeHostOptions,
  type StackRouterHostHandlers,
} from "./host";
import {
  createStackRouterBridge,
  type CreateStackRouterBridgeOptions,
} from "./stack-router-bridge";

export type WebViewBridgeProviderProps = {
  children?: ReactNode;
  /** Native → web stack handlers (e.g. Next.js `router.push`) */
  stack?: StackRouterHostHandlers;
  transport?: CreateStackRouterBridgeOptions;
  /** Install `window.stackRouterBridge` for web → native */
  enableOutboundBridge?: boolean;
  hostOptions?: Omit<
    InstallBridgeHostOptions,
    "stack" | "exposeStackRouterBridge" | "legacyInboundHandlers"
  >;
};

/**
 * Mount once near the app root (Next.js `layout`, SPA `App`).
 * Wires protocol ingress + optional legacy window stack handlers.
 */
export function WebViewBridgeProvider({
  children = null,
  stack,
  transport,
  enableOutboundBridge = true,
  hostOptions,
}: WebViewBridgeProviderProps) {
  useEffect(() => {
    const outbound = enableOutboundBridge
      ? createStackRouterBridge(transport)
      : undefined;

    const cleanup = installBridgeHost({
      stack,
      legacyInboundHandlers: Boolean(stack),
      exposeStackRouterBridge: outbound ?? false,
      ...hostOptions,
    });

    return cleanup;
  }, [stack, enableOutboundBridge, transport, hostOptions]);

  return <>{children}</>;
}
