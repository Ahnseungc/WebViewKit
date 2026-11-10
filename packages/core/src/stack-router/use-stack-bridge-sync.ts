import { useEffect, useRef } from "react";
import {
  connectStackBridge,
  type ConnectStackBridgeOptions,
  type StackBridgeSyncOptions,
} from "./bridge-sync";

/** StackRouterProvider `bridge` prop → `connectStackBridge` */
export function useStackBridgeSync(
  bridge: boolean | StackBridgeSyncOptions | undefined,
  navigator: Parameters<typeof connectStackBridge>[0],
  onBackAtRoot?: () => void
): void {
  const enabled = Boolean(bridge);
  // connectStackBridge 는 필드를 호출 시점에 읽으므로 같은 객체를 고쳐 쓴다
  const optionsRef = useRef<ConnectStackBridgeOptions>({});
  const latest = optionsRef.current;
  const bridgeOptions = typeof bridge === "object" ? bridge : {};
  latest.allowUrl = bridgeOptions.allowUrl;
  latest.onError = bridgeOptions.onError;
  latest.emitStackChanged = bridgeOptions.emitStackChanged;
  latest.onBackAtRoot = onBackAtRoot;

  useEffect(() => {
    if (!enabled) return;
    return connectStackBridge(navigator, optionsRef.current);
  }, [enabled, navigator]);
}
