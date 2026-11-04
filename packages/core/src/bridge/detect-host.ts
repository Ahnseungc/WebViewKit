import { BRIDGE_HOST_POLL_MS, BRIDGE_HOST_WAIT_MS } from "../constants";
import type { BridgeHostKind } from "./protocol";

/** flutter_inappwebview 가 JS 브릿지를 붙인 뒤 window 에 dispatch 하는 이벤트 */
export const FLUTTER_READY_EVENT = "flutterInAppWebViewPlatformReady";

export function detectBridgeHost(): BridgeHostKind {
  if (typeof window === "undefined") return "unknown";

  if (window.ReactNativeWebView?.postMessage) {
    return "react-native";
  }

  if (window.flutter_inappwebview?.callHandler) {
    return "flutter";
  }

  return "browser";
}

export function isNativeBridgeHost(host: BridgeHostKind): boolean {
  return host === "react-native" || host === "flutter";
}

export interface WaitForBridgeHostOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * 네이티브 브릿지가 늦게 주입되는 경우(Flutter platformReady 이전)를 기다린다.
 * 즉시 감지되면 바로, 아니면 ready 이벤트·폴링으로 재감지. 타임아웃·abort 시 현재 판정값.
 */
export function waitForBridgeHost({
  timeoutMs = BRIDGE_HOST_WAIT_MS,
  signal,
}: WaitForBridgeHostOptions = {}): Promise<BridgeHostKind> {
  const host = detectBridgeHost();
  if (isNativeBridgeHost(host) || host === "unknown") {
    return Promise.resolve(host);
  }

  return new Promise<BridgeHostKind>((resolve) => {
    const finish = () => {
      clearInterval(poll);
      clearTimeout(timer);
      window.removeEventListener(FLUTTER_READY_EVENT, check);
      signal?.removeEventListener("abort", finish);
      resolve(detectBridgeHost());
    };
    const check = () => {
      if (isNativeBridgeHost(detectBridgeHost())) finish();
    };
    const poll = setInterval(check, BRIDGE_HOST_POLL_MS);
    const timer = setTimeout(finish, timeoutMs);
    window.addEventListener(FLUTTER_READY_EVENT, check);
    signal?.addEventListener("abort", finish);
  });
}
