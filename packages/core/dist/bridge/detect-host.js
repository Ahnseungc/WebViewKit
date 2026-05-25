"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectBridgeHost = detectBridgeHost;
exports.isNativeBridgeHost = isNativeBridgeHost;
function detectBridgeHost() {
    var _a, _b;
    if (typeof window === "undefined")
        return "unknown";
    if ((_a = window.ReactNativeWebView) === null || _a === void 0 ? void 0 : _a.postMessage) {
        return "react-native";
    }
    if ((_b = window.flutter_inappwebview) === null || _b === void 0 ? void 0 : _b.callHandler) {
        return "flutter";
    }
    return "browser";
}
function isNativeBridgeHost(host) {
    return host === "react-native" || host === "flutter";
}
