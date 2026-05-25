"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStackRouterBridge = createStackRouterBridge;
exports.getStackRouterBridge = getStackRouterBridge;
exports.installStackRouterBridge = installStackRouterBridge;
const client_1 = require("./client");
const detect_host_1 = require("./detect-host");
/**
 * Web → native stack navigation (Flutter `callHandler` / RN `postMessage`).
 * Returns null in browser-only environments.
 */
function createStackRouterBridge(options) {
    const host = (0, detect_host_1.detectBridgeHost)();
    if (!(0, detect_host_1.isNativeBridgeHost)(host))
        return null;
    const client = (0, client_1.createWebViewBridgeClient)(options);
    return {
        push: (url, meta) => client.stackPush(url, meta !== null && meta !== void 0 ? meta : null),
        replace: (url, meta) => client.stackReplace(url, meta !== null && meta !== void 0 ? meta : null),
        pop: () => client.stackPop(),
        reset: (url) => client.stackReset(url),
    };
}
function getStackRouterBridge() {
    var _a, _b;
    if (typeof window === "undefined")
        return null;
    return (_b = (_a = window.stackRouterBridge) !== null && _a !== void 0 ? _a : createStackRouterBridge()) !== null && _b !== void 0 ? _b : null;
}
function installStackRouterBridge(options) {
    if (typeof window === "undefined")
        return null;
    const bridge = createStackRouterBridge(options);
    if (bridge) {
        window.stackRouterBridge = bridge;
    }
    return bridge;
}
