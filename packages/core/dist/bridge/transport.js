"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBridgeTransport = createBridgeTransport;
const detect_host_1 = require("./detect-host");
const protocol_1 = require("./protocol");
function stackMethodToLegacyHandler(method) {
    switch (method) {
        case protocol_1.STACK_BRIDGE_METHODS.PUSH:
            return protocol_1.FLUTTER_LEGACY_STACK_HANDLERS.push;
        case protocol_1.STACK_BRIDGE_METHODS.REPLACE:
            return protocol_1.FLUTTER_LEGACY_STACK_HANDLERS.replace;
        case protocol_1.STACK_BRIDGE_METHODS.POP:
            return protocol_1.FLUTTER_LEGACY_STACK_HANDLERS.pop;
        case protocol_1.STACK_BRIDGE_METHODS.RESET:
            return protocol_1.FLUTTER_LEGACY_STACK_HANDLERS.reset;
        default:
            return null;
    }
}
function createReactNativeTransport() {
    return {
        host: "react-native",
        async send(envelope) {
            window.ReactNativeWebView.postMessage((0, protocol_1.serializeBridgeMessage)(envelope));
        },
    };
}
function createFlutterTransport(options) {
    const useLegacy = options.flutterLegacyHandlers !== false;
    return {
        host: "flutter",
        async send(envelope) {
            var _a, _b;
            const call = window.flutter_inappwebview.callHandler.bind(window.flutter_inappwebview);
            if (useLegacy) {
                const handler = stackMethodToLegacyHandler(envelope.method);
                if (handler) {
                    const payload = envelope.payload;
                    if (envelope.method === protocol_1.STACK_BRIDGE_METHODS.POP) {
                        await call(handler);
                        return;
                    }
                    const url = (_a = payload === null || payload === void 0 ? void 0 : payload.url) !== null && _a !== void 0 ? _a : "";
                    const meta = payload && "meta" in payload ? (_b = payload.meta) !== null && _b !== void 0 ? _b : null : null;
                    await call(handler, url, meta);
                    return;
                }
            }
            await call(protocol_1.FLUTTER_UNIFIED_HANDLER, (0, protocol_1.serializeBridgeMessage)(envelope));
        },
    };
}
const browserTransport = {
    host: "browser",
    async send() {
        /* no native host — web-only */
    },
};
function createBridgeTransport(host = (0, detect_host_1.detectBridgeHost)(), options = {}) {
    if (host === "react-native")
        return createReactNativeTransport();
    if (host === "flutter")
        return createFlutterTransport(options);
    return browserTransport;
}
