export {
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_NAMESPACE,
  STACK_BRIDGE_METHODS,
  FLUTTER_LEGACY_STACK_HANDLERS,
  FLUTTER_UNIFIED_HANDLER,
  RN_BRIDGE_HANDLER,
  createBridgeId,
  createBridgeEnvelope,
  isBridgeEnvelope,
  parseBridgeMessage,
  serializeBridgeMessage,
} from "./protocol";

export type {
  BridgeHostKind,
  StackBridgeMethod,
  StackMeta,
  StackPushPayload,
  StackReplacePayload,
  StackResetPayload,
  BridgeEnvelope,
  BridgeErrorBody,
} from "./protocol";

export { detectBridgeHost, isNativeBridgeHost } from "./detect-host";
export {
  createBridgeTransport,
  type BridgeTransport,
  type BridgeTransportOptions,
} from "./transport";
export {
  WebViewBridgeClient,
  createWebViewBridgeClient,
  type WebViewBridgeClientOptions,
} from "./client";
export {
  installBridgeHost,
  handleBridgeMessage,
  emitBridgeEnvelope,
  type InstallBridgeHostOptions,
  type StackRouterHostHandlers,
  type BridgeHostCleanup,
} from "./host";
export {
  createStackRouterBridge,
  getStackRouterBridge,
  installStackRouterBridge,
  type StackRouterBridge,
  type CreateStackRouterBridgeOptions,
} from "./stack-router-bridge";
export { WebViewBridgeProvider } from "./WebViewBridgeProvider";
export type { WebViewBridgeProviderProps } from "./WebViewBridgeProvider";
