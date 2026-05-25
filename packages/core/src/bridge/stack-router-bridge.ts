import { createWebViewBridgeClient } from "./client";
import { detectBridgeHost, isNativeBridgeHost } from "./detect-host";
import type { StackMeta } from "./protocol";
import type { BridgeTransportOptions } from "./transport";

export type StackRouterBridge = {
  push: (url: string, meta?: StackMeta) => Promise<unknown>;
  replace: (url: string, meta?: StackMeta) => Promise<unknown>;
  pop: () => Promise<unknown>;
  reset: (url: string) => Promise<unknown>;
};

export type CreateStackRouterBridgeOptions = BridgeTransportOptions;

/**
 * Web → native stack navigation (Flutter `callHandler` / RN `postMessage`).
 * Returns null in browser-only environments.
 */
export function createStackRouterBridge(
  options?: CreateStackRouterBridgeOptions
): StackRouterBridge | null {
  const host = detectBridgeHost();
  if (!isNativeBridgeHost(host)) return null;

  const client = createWebViewBridgeClient(options);

  return {
    push: (url, meta) => client.stackPush(url, meta ?? null),
    replace: (url, meta) => client.stackReplace(url, meta ?? null),
    pop: () => client.stackPop(),
    reset: (url) => client.stackReset(url),
  };
}

export function getStackRouterBridge(): StackRouterBridge | null {
  if (typeof window === "undefined") return null;
  return window.stackRouterBridge ?? createStackRouterBridge() ?? null;
}

export function installStackRouterBridge(
  options?: CreateStackRouterBridgeOptions
): StackRouterBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = createStackRouterBridge(options);
  if (bridge) {
    window.stackRouterBridge = bridge;
  }
  return bridge;
}
