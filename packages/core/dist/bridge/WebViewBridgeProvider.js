"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebViewBridgeProvider = WebViewBridgeProvider;
const jsx_runtime_1 = require("@emotion/react/jsx-runtime");
const react_1 = require("react");
const host_1 = require("./host");
const stack_router_bridge_1 = require("./stack-router-bridge");
/**
 * Mount once near the app root (Next.js `layout`, SPA `App`).
 * Wires protocol ingress + optional legacy window stack handlers.
 */
function WebViewBridgeProvider({ children = null, stack, transport, enableOutboundBridge = true, hostOptions, }) {
    (0, react_1.useEffect)(() => {
        const outbound = enableOutboundBridge
            ? (0, stack_router_bridge_1.createStackRouterBridge)(transport)
            : undefined;
        const cleanup = (0, host_1.installBridgeHost)({
            stack,
            legacyInboundHandlers: Boolean(stack),
            exposeStackRouterBridge: outbound !== null && outbound !== void 0 ? outbound : false,
            ...hostOptions,
        });
        return cleanup;
    }, [stack, enableOutboundBridge, transport, hostOptions]);
    return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: children });
}
