/** WebViewKit native bridge protocol (v1) */
export declare const BRIDGE_PROTOCOL_VERSION: 1;
export declare const BRIDGE_NAMESPACE: "webviewkit";
export type BridgeHostKind = "react-native" | "flutter" | "browser" | "unknown";
/** Stack navigation — maps to common `stackPush` / `stackPop` WebView handlers */
export declare const STACK_BRIDGE_METHODS: {
    readonly PUSH: "stack.push";
    readonly REPLACE: "stack.replace";
    readonly POP: "stack.pop";
    readonly RESET: "stack.reset";
};
export type StackBridgeMethod = (typeof STACK_BRIDGE_METHODS)[keyof typeof STACK_BRIDGE_METHODS];
export type StackMeta = Record<string, unknown> | null;
export type StackPushPayload = {
    url: string;
    meta?: StackMeta;
};
export type StackReplacePayload = StackPushPayload;
export type StackResetPayload = {
    url: string;
    meta?: StackMeta;
};
export type BridgeErrorBody = {
    code: string;
    message: string;
};
export type BridgeEnvelope<TPayload = unknown> = {
    v: typeof BRIDGE_PROTOCOL_VERSION;
    ns: typeof BRIDGE_NAMESPACE;
    id: string;
    method: string;
    payload?: TPayload;
    error?: BridgeErrorBody;
};
export declare function createBridgeId(): string;
export declare function createBridgeEnvelope<TPayload>(method: string, payload?: TPayload, id?: string): BridgeEnvelope<TPayload>;
export declare function isBridgeEnvelope(value: unknown): value is BridgeEnvelope;
export declare function parseBridgeMessage(raw: string | unknown): BridgeEnvelope | null;
export declare function serializeBridgeMessage(msg: BridgeEnvelope): string;
/** Flutter InAppWebView legacy handler names */
export declare const FLUTTER_LEGACY_STACK_HANDLERS: {
    readonly push: "stackPush";
    readonly replace: "stackReplace";
    readonly pop: "stackPop";
    readonly reset: "stackReset";
};
/** Unified handler name when native listens on one channel */
export declare const FLUTTER_UNIFIED_HANDLER = "webviewkitBridge";
/** React Native receives messages via this global handler name suggestion */
export declare const RN_BRIDGE_HANDLER = "webviewkitBridge";
//# sourceMappingURL=protocol.d.ts.map