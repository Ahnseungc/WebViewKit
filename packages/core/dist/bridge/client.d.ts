import { type BridgeTransportOptions } from "./transport";
import { detectBridgeHost } from "./detect-host";
import type { BridgeTransport } from "./transport";
import { type BridgeEnvelope, type StackMeta } from "./protocol";
export type WebViewBridgeClientOptions = BridgeTransportOptions & {
    transport?: BridgeTransport;
};
export declare class WebViewBridgeClient {
    readonly host: ReturnType<typeof detectBridgeHost>;
    private readonly transport;
    constructor(options?: WebViewBridgeClientOptions);
    send(envelope: BridgeEnvelope): Promise<void>;
    request<TPayload = unknown>(method: string, payload?: TPayload): Promise<BridgeEnvelope<TPayload>>;
    stackPush(url: string, meta?: StackMeta): Promise<BridgeEnvelope>;
    stackReplace(url: string, meta?: StackMeta): Promise<BridgeEnvelope>;
    stackPop(): Promise<BridgeEnvelope>;
    stackReset(url: string, meta?: StackMeta): Promise<BridgeEnvelope>;
}
export declare function createWebViewBridgeClient(options?: WebViewBridgeClientOptions): WebViewBridgeClient;
//# sourceMappingURL=client.d.ts.map