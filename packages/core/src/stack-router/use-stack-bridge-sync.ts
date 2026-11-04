import { useEffect, useRef } from "react";
import { createWebViewBridgeClient } from "../bridge/client";
import { detectBridgeHost, isNativeBridgeHost } from "../bridge/detect-host";
import type { BridgeError } from "../bridge/errors";
import { installBridgeHost } from "../bridge/host";
import type { BridgeEnvelope } from "../bridge/protocol";
import type { AllowUrl } from "../bridge/url-policy";

export interface StackBridgeSyncOptions {
  allowUrl?: AllowUrl;
  onError?: (error: BridgeError, envelope?: BridgeEnvelope) => void;
  /** 웹 스택 변경 시 `stack.changed` 전송 (기본 true) */
  emitStackChanged?: boolean;
}

interface StackRouterLike {
  depth: number;
  currentPath: string;
  canGoBack: boolean;
  push: (path: string) => boolean;
  replace: (path: string) => boolean;
  reset: (path: string) => boolean;
  back: () => boolean;
}

/**
 * StackRouterProvider ↔ 네이티브 브릿지 연결.
 * - native `stack.*` → 라우터 push/replace/reset/back
 * - native `back.request` → canGoBack 이면 back, 아니면 onBackAtRoot. `{ handled }` 회신
 * - web 스택 변경 → `stack.changed { depth, path }`
 */
export function useStackBridgeSync(
  bridge: boolean | StackBridgeSyncOptions | undefined,
  router: StackRouterLike,
  onBackAtRoot?: () => void
): void {
  const enabled = Boolean(bridge);
  const options = typeof bridge === "object" ? bridge : {};
  const latest = useRef({ router, options, onBackAtRoot });
  latest.current = { router, options, onBackAtRoot };

  useEffect(() => {
    if (!enabled) return;
    return installBridgeHost({
      allowUrl: latest.current.options.allowUrl,
      onError: (error, envelope) =>
        latest.current.options.onError?.(error, envelope),
      stack: {
        push: (url) => latest.current.router.push(url),
        replace: (url) => latest.current.router.replace(url),
        reset: (url) => latest.current.router.reset(url),
        pop: () => latest.current.router.back(),
      },
      onBackRequest: () => {
        const current = latest.current;
        if (current.router.canGoBack) return current.router.back();
        current.onBackAtRoot?.();
        return false;
      },
    });
  }, [enabled]);

  const { depth, currentPath } = router;
  const emit = enabled && options.emitStackChanged !== false;
  useEffect(() => {
    if (!emit || !isNativeBridgeHost(detectBridgeHost())) return;
    createWebViewBridgeClient()
      .notifyStackChanged({ depth, path: currentPath })
      .catch((error: BridgeError) => latest.current.options.onError?.(error));
  }, [emit, depth, currentPath]);
}
