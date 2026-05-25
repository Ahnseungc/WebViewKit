"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBridgeMessage = handleBridgeMessage;
exports.installBridgeHost = installBridgeHost;
exports.emitBridgeEnvelope = emitBridgeEnvelope;
const protocol_1 = require("./protocol");
async function dispatchEnvelope(envelope, options) {
    var _a, _b, _c, _d, _e;
    (_a = options.onMessage) === null || _a === void 0 ? void 0 : _a.call(options, envelope);
    const custom = (_b = options.handlers) === null || _b === void 0 ? void 0 : _b[envelope.method];
    if (custom) {
        return Boolean(await custom(envelope.payload, envelope));
    }
    const stack = options.stack;
    if (!stack)
        return false;
    const payload = envelope.payload;
    switch (envelope.method) {
        case protocol_1.STACK_BRIDGE_METHODS.PUSH:
            if (!(payload === null || payload === void 0 ? void 0 : payload.url))
                return false;
            return Boolean(await stack.push(payload.url, (_c = payload.meta) !== null && _c !== void 0 ? _c : null));
        case protocol_1.STACK_BRIDGE_METHODS.REPLACE:
            if (!(payload === null || payload === void 0 ? void 0 : payload.url))
                return false;
            return Boolean(await stack.replace(payload.url, (_d = payload.meta) !== null && _d !== void 0 ? _d : null));
        case protocol_1.STACK_BRIDGE_METHODS.POP:
            return Boolean(await stack.pop());
        case protocol_1.STACK_BRIDGE_METHODS.RESET:
            if (!(payload === null || payload === void 0 ? void 0 : payload.url))
                return false;
            return Boolean(await stack.reset(payload.url, (_e = payload.meta) !== null && _e !== void 0 ? _e : null));
        default:
            return false;
    }
}
function handleBridgeMessage(raw, options) {
    const envelope = (0, protocol_1.parseBridgeMessage)(raw);
    if (!envelope)
        return Promise.resolve(false);
    return dispatchEnvelope(envelope, options);
}
function installBridgeHost(options) {
    if (typeof window === "undefined") {
        return () => undefined;
    }
    const inbound = (raw) => {
        void handleBridgeMessage(raw, options);
    };
    window.webviewkitBridge = { postMessage: inbound };
    if (options.legacyInboundHandlers !== false && options.stack) {
        const { stack } = options;
        window.stackPush = (url, meta) => Promise.resolve(stack.push(url, meta !== null && meta !== void 0 ? meta : null)).then(Boolean);
        window.stackReplace = (url, meta) => Promise.resolve(stack.replace(url, meta !== null && meta !== void 0 ? meta : null)).then(Boolean);
        window.stackPop = () => Promise.resolve(stack.pop()).then(Boolean);
        window.stackReset = (url, meta) => Promise.resolve(stack.reset(url, meta !== null && meta !== void 0 ? meta : null)).then(Boolean);
    }
    if (options.exposeStackRouterBridge) {
        if (typeof options.exposeStackRouterBridge === "object") {
            window.stackRouterBridge = options.exposeStackRouterBridge;
        }
    }
    return () => {
        delete window.webviewkitBridge;
        delete window.stackPush;
        delete window.stackReplace;
        delete window.stackPop;
        delete window.stackReset;
        if (options.exposeStackRouterBridge) {
            delete window.stackRouterBridge;
        }
    };
}
/** Emit a protocol envelope from web (e.g. for tests or custom native listeners) */
function emitBridgeEnvelope(method, payload) {
    return (0, protocol_1.createBridgeEnvelope)(method, payload);
}
