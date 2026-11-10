/** React 없는 브릿지 API (`index.ts` 는 여기에 WebViewBridgeProvider 를 더한다) */
export {
  type BridgeRequestOptions,
  type BridgeResult,
  createWebViewBridgeClient,
  WebViewBridgeClient,
  type WebViewBridgeClientOptions,
} from "./client";
export {
  detectBridgeHost,
  FLUTTER_READY_EVENT,
  isNativeBridgeHost,
  waitForBridgeHost,
  type WaitForBridgeHostOptions,
} from "./detect-host";
export {
  BRIDGE_ERROR_CODES,
  BridgeError,
  type BridgeErrorCode,
} from "./errors";
export type { FlutterInAppWebViewBridge } from "./globals";
export {
  type BridgeHostCleanup,
  emitBridgeEnvelope,
  handleBridgeMessage,
  installBridgeHost,
  type InstallBridgeHostOptions,
  type StackRouterHostHandlers,
} from "./host";
export type {
  BackRequestResult,
  BridgeEnvelope,
  BridgeErrorBody,
  BridgeHostKind,
  StackBridgeMethod,
  StackChangedPayload,
  StackMeta,
  StackPushPayload,
  StackReplacePayload,
  StackResetPayload,
} from "./protocol";
export {
  BACK_REQUEST_METHOD,
  BRIDGE_NAMESPACE,
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_RESPONSE_METHOD,
  createBridgeEnvelope,
  createBridgeId,
  createBridgeResponse,
  FLUTTER_LEGACY_STACK_HANDLERS,
  FLUTTER_UNIFIED_HANDLER,
  isBridgeEnvelope,
  parseBridgeMessage,
  RN_BRIDGE_HANDLER,
  serializeBridgeMessage,
  STACK_BRIDGE_METHODS,
} from "./protocol";
export {
  createStackRouterBridge,
  type CreateStackRouterBridgeOptions,
  getStackRouterBridge,
  installStackRouterBridge,
  resetStackRouterBridgeCache,
  type StackRouterBridge,
} from "./stack-router-bridge";
export {
  type BridgeTransport,
  type BridgeTransportOptions,
  createBridgeTransport,
} from "./transport";
export {
  type AllowUrl,
  assertStackUrl,
  isSafeStackUrl,
  toStackPath,
} from "./url-policy";
