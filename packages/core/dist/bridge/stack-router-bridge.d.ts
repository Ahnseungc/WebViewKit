import type { StackMeta } from "./protocol";
import type { BridgeTransportOptions } from "./transport";
export type StackRouterBridge = {
    push: (url: string, meta?: StackMeta) => Promise<unknown>;
    replace: (url: string, meta?: StackMeta) => Promise<unknown>;
    pop: () => Promise<unknown>;
    reset: (url: string) => Promise<unknown>;
};
export type CreateStackRouterBridgeOptions = BridgeTransportOptions;
/**
 * Web → native stack navigation (Flutter `callHandler` / RN `postMessage`).
 * Returns null in browser-only environments.
 */
export declare function createStackRouterBridge(options?: CreateStackRouterBridgeOptions): StackRouterBridge | null;
export declare function getStackRouterBridge(): StackRouterBridge | null;
export declare function installStackRouterBridge(options?: CreateStackRouterBridgeOptions): StackRouterBridge | null;
//# sourceMappingURL=stack-router-bridge.d.ts.map