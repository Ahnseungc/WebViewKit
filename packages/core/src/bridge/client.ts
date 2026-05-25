import { createBridgeTransport, type BridgeTransportOptions } from "./transport";
import { detectBridgeHost } from "./detect-host";
import type { BridgeTransport } from "./transport";
import {
  createBridgeEnvelope,
  STACK_BRIDGE_METHODS,
  type BridgeEnvelope,
  type StackMeta,
  type StackPushPayload,
  type StackResetPayload,
} from "./protocol";

export type WebViewBridgeClientOptions = BridgeTransportOptions & {
  transport?: BridgeTransport;
};

export class WebViewBridgeClient {
  readonly host: ReturnType<typeof detectBridgeHost>;
  private readonly transport: BridgeTransport;

  constructor(options: WebViewBridgeClientOptions = {}) {
    this.host = options.transport?.host ?? detectBridgeHost();
    this.transport =
      options.transport ?? createBridgeTransport(this.host, options);
  }

  async send(envelope: BridgeEnvelope): Promise<void> {
    await this.transport.send(envelope);
  }

  async request<TPayload = unknown>(
    method: string,
    payload?: TPayload
  ): Promise<BridgeEnvelope<TPayload>> {
    const envelope = createBridgeEnvelope(method, payload);
    await this.send(envelope);
    return envelope;
  }

  stackPush(url: string, meta: StackMeta = null): Promise<BridgeEnvelope> {
    return this.request<StackPushPayload>(STACK_BRIDGE_METHODS.PUSH, {
      url,
      meta,
    });
  }

  stackReplace(url: string, meta: StackMeta = null): Promise<BridgeEnvelope> {
    return this.request<StackPushPayload>(STACK_BRIDGE_METHODS.REPLACE, {
      url,
      meta,
    });
  }

  stackPop(): Promise<BridgeEnvelope> {
    return this.request(STACK_BRIDGE_METHODS.POP);
  }

  stackReset(url: string, meta: StackMeta = null): Promise<BridgeEnvelope> {
    return this.request<StackResetPayload>(STACK_BRIDGE_METHODS.RESET, {
      url,
      meta,
    });
  }
}

export function createWebViewBridgeClient(
  options?: WebViewBridgeClientOptions
): WebViewBridgeClient {
  return new WebViewBridgeClient(options);
}
