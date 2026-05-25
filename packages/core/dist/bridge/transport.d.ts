import type { BridgeEnvelope, BridgeHostKind } from "./protocol";
export type BridgeTransportOptions = {
    /** Flutter: use stackPush/stackPop handlers (default true) */
    flutterLegacyHandlers?: boolean;
};
export interface BridgeTransport {
    readonly host: BridgeHostKind;
    send(envelope: BridgeEnvelope): Promise<void>;
}
export declare function createBridgeTransport(host?: BridgeHostKind, options?: BridgeTransportOptions): BridgeTransport;
//# sourceMappingURL=transport.d.ts.map