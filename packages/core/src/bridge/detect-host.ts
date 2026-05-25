import type { BridgeHostKind } from "./protocol";

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
