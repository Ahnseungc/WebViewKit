import type { BridgeRequestOptions, BridgeResult } from "./client";
import { createWebViewBridgeClient } from "./client";
import { detectBridgeHost, isNativeBridgeHost } from "./detect-host";
import type { StackMeta } from "./protocol";
import type { BridgeTransportOptions } from "./transport";
import type { AllowUrl } from "./url-policy";

export type StackRouterBridge = {
  push: (
    url: string,
    meta?: StackMeta,
    options?: BridgeRequestOptions
  ) => Promise<BridgeResult>;
  replace: (
    url: string,
    meta?: StackMeta,
    options?: BridgeRequestOptions
  ) => Promise<BridgeResult>;
  pop: (options?: BridgeRequestOptions) => Promise<BridgeResult>;
  reset: (
    url: string,
    meta?: StackMeta,
    options?: BridgeRequestOptions
  ) => Promise<BridgeResult>;
};

export type CreateStackRouterBridgeOptions = BridgeTransportOptions & {
  allowUrl?: AllowUrl;
  timeoutMs?: number;
};

let cachedBridge: StackRouterBridge | null = null;

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
    push: (url, meta, requestOptions) =>
      client.stackPush(url, meta ?? null, requestOptions),
    replace: (url, meta, requestOptions) =>
      client.stackReplace(url, meta ?? null, requestOptions),
    pop: (requestOptions) => client.stackPop(requestOptions),
    reset: (url, meta, requestOptions) =>
      client.stackReset(url, meta ?? null, requestOptions),
  };
}

/** `window.stackRouterBridge` → 모듈 캐시 → 새로 생성 후 캐시 */
export function getStackRouterBridge(): StackRouterBridge | null {
  if (typeof window === "undefined") return null;
  if (window.stackRouterBridge) return window.stackRouterBridge;
  if (!cachedBridge) cachedBridge = createStackRouterBridge();
  return cachedBridge;
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

/** 테스트·호스트 전환용 캐시 초기화 */
export function resetStackRouterBridgeCache(): void {
  cachedBridge = null;
}
