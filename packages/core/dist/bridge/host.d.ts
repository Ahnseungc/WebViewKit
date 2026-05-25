import { type BridgeEnvelope, type StackMeta } from "./protocol";
import type { StackRouterBridge } from "./stack-router-bridge";
export type StackRouterHostHandlers = {
    push: (url: string, meta?: StackMeta) => boolean | Promise<boolean>;
    replace: (url: string, meta?: StackMeta) => boolean | Promise<boolean>;
    pop: () => boolean | Promise<boolean>;
    reset: (url: string, meta?: StackMeta) => boolean | Promise<boolean>;
};
export type InstallBridgeHostOptions = {
    /** Native → web stack navigation */
    stack?: StackRouterHostHandlers;
    /** Custom method handlers keyed by envelope `method` */
    handlers?: Record<string, (payload: unknown, envelope: BridgeEnvelope) => boolean | Promise<boolean>>;
    /** Called for every valid envelope after routing */
    onMessage?: (envelope: BridgeEnvelope) => void;
    /**
     * Expose `window.stackRouterBridge` for imperative web→native calls.
     * Requires `createStackRouterBridge()` to be set separately or via `stackRouterBridge` option.
     */
    exposeStackRouterBridge?: StackRouterBridge | boolean;
    /**
     * Register `window.stackPush` / `stackPop` for Flutter native→web.
     */
    legacyInboundHandlers?: boolean;
};
export declare function handleBridgeMessage(raw: string | unknown, options: InstallBridgeHostOptions): Promise<boolean>;
export type BridgeHostCleanup = () => void;
export declare function installBridgeHost(options: InstallBridgeHostOptions): BridgeHostCleanup;
/** Emit a protocol envelope from web (e.g. for tests or custom native listeners) */
export declare function emitBridgeEnvelope(method: string, payload?: unknown): BridgeEnvelope;
//# sourceMappingURL=host.d.ts.map