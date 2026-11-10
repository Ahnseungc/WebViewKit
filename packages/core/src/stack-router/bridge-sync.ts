import { createWebViewBridgeClient } from "../bridge/client";
import { detectBridgeHost, isNativeBridgeHost } from "../bridge/detect-host";
import type { BridgeError } from "../bridge/errors";
import { installBridgeHost } from "../bridge/host";
import type { BridgeEnvelope } from "../bridge/protocol";
import type { AllowUrl } from "../bridge/url-policy";
import type { StackNavigator } from "./navigator";

export interface StackBridgeSyncOptions {
  allowUrl?: AllowUrl;
  onError?: (error: BridgeError, envelope?: BridgeEnvelope) => void;
  /** 웹 스택 변경 시 `stack.changed` 전송 (기본 true) */
  emitStackChanged?: boolean;
}

export interface ConnectStackBridgeOptions extends StackBridgeSyncOptions {
  /** 루트에서 native `back.request` 가 왔을 때 */
  onBackAtRoot?: () => void;
}

type NavigatorLike = Pick<
  StackNavigator,
  "getState" | "subscribe" | "push" | "replace" | "reset" | "back"
>;

/**
 * 스택 네비게이터 ↔ 네이티브 브릿지 연결. 반환값은 정리 함수.
 * - native `stack.*` → push/replace/reset/back
 * - native `back.request` → depth > 1 이면 back, 아니면 onBackAtRoot. `{ handled }` 회신
 * - web 스택 변경 → `stack.changed { depth, path }`
 *
 * `options` 의 필드는 호출 시점에 읽으므로, 같은 객체를 고쳐 쓰면 최신 값이 반영된다
 */
export function connectStackBridge(
  navigator: NavigatorLike,
  options: ConnectStackBridgeOptions = {}
): () => void {
  const uninstall = installBridgeHost({
    allowUrl: options.allowUrl,
    onError: (error, envelope) => options.onError?.(error, envelope),
    stack: {
      push: (url) => navigator.push(url),
      replace: (url) => navigator.replace(url),
      reset: (url) => navigator.reset(url),
      pop: () => navigator.back(),
    },
    onBackRequest: () => {
      if (navigator.getState().entries.length > 1) return navigator.back();
      options.onBackAtRoot?.();
      return false;
    },
  });

  let last = "";
  const emit = () => {
    if (options.emitStackChanged === false) return;
    const { entries } = navigator.getState();
    const depth = entries.length;
    const path = entries[depth - 1].path;
    const signature = `${depth}\n${path}`;
    if (signature === last) return;
    last = signature;
    if (!isNativeBridgeHost(detectBridgeHost())) return;
    createWebViewBridgeClient()
      .notifyStackChanged({ depth, path })
      .catch((error: BridgeError) => options.onError?.(error));
  };
  emit();
  const unsubscribe = navigator.subscribe(emit);

  return () => {
    unsubscribe();
    uninstall();
  };
}
