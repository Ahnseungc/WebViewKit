import React, { type ReactNode, useEffect, useRef } from "react";
import { waitForBridgeHost } from "./detect-host";
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
 * `stack`·`hostOptions` 는 최신 값을 ref 로 읽으므로 인라인 객체여도 재설치하지 않는다.
 */
export function WebViewBridgeProvider({
  children = null,
  stack,
  transport,
  enableOutboundBridge = true,
  hostOptions,
}: WebViewBridgeProviderProps) {
  const latest = useRef({ stack, transport, hostOptions });
  latest.current = { stack, transport, hostOptions };
  const hasStack = Boolean(stack);

  useEffect(() => {
    const call =
      <K extends keyof StackRouterHostHandlers>(key: K) =>
      (...args: Parameters<StackRouterHostHandlers[K]>) => {
        const handler = latest.current.stack?.[key] as
          | ((
              ...a: Parameters<StackRouterHostHandlers[K]>
            ) => boolean | Promise<boolean>)
          | undefined;
        return handler ? handler(...args) : false;
      };

    const options = latest.current.hostOptions;
    const cleanups: (() => void)[] = [];
    cleanups.push(
      installBridgeHost({
        ...options,
        onMessage: (envelope) =>
          latest.current.hostOptions?.onMessage?.(envelope),
        onError: (error, envelope) =>
          latest.current.hostOptions?.onError?.(error, envelope),
        onBackRequest: () =>
          latest.current.hostOptions?.onBackRequest?.() ?? false,
        stack: hasStack
          ? {
              push: call("push"),
              replace: call("replace"),
              pop: call("pop"),
              reset: call("reset"),
            }
          : undefined,
        legacyInboundHandlers: hasStack,
      })
    );

    // Flutter 는 platformReady 이후에 브릿지가 붙을 수 있다 → 감지 후 outbound 설치
    const abort = new AbortController();
    if (enableOutboundBridge) {
      void waitForBridgeHost({ signal: abort.signal }).then(() => {
        if (abort.signal.aborted) return;
        const outbound = createStackRouterBridge(latest.current.transport);
        if (!outbound) return;
        window.stackRouterBridge = outbound;
        cleanups.push(() => {
          if (window.stackRouterBridge === outbound)
            delete window.stackRouterBridge;
        });
      });
    }

    return () => {
      abort.abort();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [enableOutboundBridge, hasStack]);

  return <>{children}</>;
}
