"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RN_BRIDGE_HANDLER = exports.FLUTTER_UNIFIED_HANDLER = exports.FLUTTER_LEGACY_STACK_HANDLERS = exports.STACK_BRIDGE_METHODS = exports.BRIDGE_NAMESPACE = exports.BRIDGE_PROTOCOL_VERSION = void 0;
exports.createBridgeId = createBridgeId;
exports.createBridgeEnvelope = createBridgeEnvelope;
exports.isBridgeEnvelope = isBridgeEnvelope;
exports.parseBridgeMessage = parseBridgeMessage;
exports.serializeBridgeMessage = serializeBridgeMessage;
/** WebViewKit native bridge protocol (v1) */
exports.BRIDGE_PROTOCOL_VERSION = 1;
exports.BRIDGE_NAMESPACE = "webviewkit";
/** Stack navigation — maps to common `stackPush` / `stackPop` WebView handlers */
exports.STACK_BRIDGE_METHODS = {
    PUSH: "stack.push",
    REPLACE: "stack.replace",
    POP: "stack.pop",
    RESET: "stack.reset",
};
function createBridgeId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `wv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function createBridgeEnvelope(method, payload, id) {
    return {
        v: exports.BRIDGE_PROTOCOL_VERSION,
        ns: exports.BRIDGE_NAMESPACE,
        id: id !== null && id !== void 0 ? id : createBridgeId(),
        method,
        ...(payload !== undefined ? { payload } : {}),
    };
}
function isBridgeEnvelope(value) {
    if (!value || typeof value !== "object")
        return false;
    const o = value;
    return (o.v === exports.BRIDGE_PROTOCOL_VERSION &&
        o.ns === exports.BRIDGE_NAMESPACE &&
        typeof o.id === "string" &&
        typeof o.method === "string");
}
function parseBridgeMessage(raw) {
    try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return isBridgeEnvelope(parsed) ? parsed : null;
    }
    catch (_a) {
        return null;
    }
}
function serializeBridgeMessage(msg) {
    return JSON.stringify(msg);
}
/** Flutter InAppWebView legacy handler names */
exports.FLUTTER_LEGACY_STACK_HANDLERS = {
    push: "stackPush",
    replace: "stackReplace",
    pop: "stackPop",
    reset: "stackReset",
};
/** Unified handler name when native listens on one channel */
exports.FLUTTER_UNIFIED_HANDLER = "webviewkitBridge";
/** React Native receives messages via this global handler name suggestion */
exports.RN_BRIDGE_HANDLER = "webviewkitBridge";
