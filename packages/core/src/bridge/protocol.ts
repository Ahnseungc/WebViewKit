import type { BridgeErrorCode } from "./errors";

/** WebViewKit native bridge protocol (v1) */
export const BRIDGE_PROTOCOL_VERSION = 1 as const;
export const BRIDGE_NAMESPACE = "webviewkit" as const;

export type BridgeHostKind = "react-native" | "flutter" | "browser" | "unknown";

/** Stack navigation — maps to common `stackPush` / `stackPop` WebView handlers */
export const STACK_BRIDGE_METHODS = {
  PUSH: "stack.push",
  REPLACE: "stack.replace",
  POP: "stack.pop",
  RESET: "stack.reset",
  /** web → native: 웹 스택 깊이 변경 알림 */
  CHANGED: "stack.changed",
} as const;

export type StackBridgeMethod =
  (typeof STACK_BRIDGE_METHODS)[keyof typeof STACK_BRIDGE_METHODS];

/** native → web: 하드웨어 back. 응답 payload `{ handled }` */
export const BACK_REQUEST_METHOD = "back.request" as const;

/** 요청에 대한 응답 envelope method (`replyTo` 필수) */
export const BRIDGE_RESPONSE_METHOD = "bridge.response" as const;

export type StackMeta = Record<string, unknown> | null;

export type StackPushPayload = { url: string; meta?: StackMeta };
export type StackReplacePayload = StackPushPayload;
export type StackResetPayload = { url: string; meta?: StackMeta };
export type StackChangedPayload = { depth: number; path: string };
export type BackRequestResult = { handled: boolean };

export type BridgeErrorBody = {
  code: BridgeErrorCode | string;
  message: string;
};

export type BridgeEnvelope<TPayload = unknown> = {
  v: typeof BRIDGE_PROTOCOL_VERSION;
  ns: typeof BRIDGE_NAMESPACE;
  id: string;
  method: string;
  payload?: TPayload;
  error?: BridgeErrorBody;
  /** 응답일 때 원 요청 id */
  replyTo?: string;
};

export function createBridgeId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `wv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBridgeEnvelope<TPayload>(
  method: string,
  payload?: TPayload,
  id?: string
): BridgeEnvelope<TPayload> {
  return {
    v: BRIDGE_PROTOCOL_VERSION,
    ns: BRIDGE_NAMESPACE,
    id: id ?? createBridgeId(),
    method,
    ...(payload !== undefined ? { payload } : {}),
  };
}

export function createBridgeResponse<TPayload>(
  request: Pick<BridgeEnvelope, "id">,
  result: { payload?: TPayload; error?: BridgeErrorBody }
): BridgeEnvelope<TPayload> {
  return {
    ...createBridgeEnvelope(BRIDGE_RESPONSE_METHOD, result.payload),
    replyTo: request.id,
    ...(result.error ? { error: result.error } : {}),
  };
}

export function isBridgeEnvelope(value: unknown): value is BridgeEnvelope {
  if (!value || typeof value !== "object") return false;
  const o = value as BridgeEnvelope;
  return (
    o.v === BRIDGE_PROTOCOL_VERSION &&
    o.ns === BRIDGE_NAMESPACE &&
    typeof o.id === "string" &&
    typeof o.method === "string"
  );
}

export function parseBridgeMessage(
  raw: string | unknown
): BridgeEnvelope | null {
  try {
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    return isBridgeEnvelope(parsed) ? parsed : null;
  } catch {
    // 프로토콜 밖 메시지(다른 라이브러리의 postMessage 등)는 무시한다
    return null;
  }
}

export function serializeBridgeMessage(msg: BridgeEnvelope): string {
  return JSON.stringify(msg);
}

/** Flutter InAppWebView legacy handler names */
export const FLUTTER_LEGACY_STACK_HANDLERS = {
  push: "stackPush",
  replace: "stackReplace",
  pop: "stackPop",
  reset: "stackReset",
} as const;

/** Unified handler name when native listens on one channel */
export const FLUTTER_UNIFIED_HANDLER = "webviewkitBridge";

/** React Native receives messages via this global handler name suggestion */
export const RN_BRIDGE_HANDLER = "webviewkitBridge";
