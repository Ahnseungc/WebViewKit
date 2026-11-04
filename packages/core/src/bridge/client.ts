import { BRIDGE_TIMEOUT_MS } from "../constants";
import { detectBridgeHost } from "./detect-host";
import { BRIDGE_ERROR_CODES, BridgeError } from "./errors";
import { cancelResponse, waitForResponse } from "./pending-responses";
import {
  type BridgeEnvelope,
  createBridgeEnvelope,
  STACK_BRIDGE_METHODS,
  type StackChangedPayload,
  type StackMeta,
  type StackPushPayload,
  type StackResetPayload,
} from "./protocol";
import type { BridgeTransport } from "./transport";
import {
  type BridgeTransportOptions,
  createBridgeTransport,
} from "./transport";
import { type AllowUrl, assertStackUrl } from "./url-policy";

export type WebViewBridgeClientOptions = BridgeTransportOptions & {
  transport?: BridgeTransport;
  /** outbound stack URL 검증 (기본 isSafeStackUrl) */
  allowUrl?: AllowUrl;
  /** 요청 기본 타임아웃 ms */
  timeoutMs?: number;
};

export interface BridgeRequestOptions {
  timeoutMs?: number;
  /**
   * RN: 네이티브가 `bridge.response`(replyTo) 로 회신할 때까지 기다린다.
   * 기본 false — 전송 즉시 resolve (1.x 네이티브 호환).
   */
  expectResponse?: boolean;
}

export interface BridgeResult<TResult = unknown> {
  /** 전송한 요청 envelope */
  envelope: BridgeEnvelope;
  /** Flutter callHandler 반환값 또는 RN 응답 payload */
  result?: TResult;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  method: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new BridgeError(
            BRIDGE_ERROR_CODES.TIMEOUT,
            `${method} timed out after ${timeoutMs}ms`
          )
        ),
      timeoutMs
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export class WebViewBridgeClient {
  readonly host: ReturnType<typeof detectBridgeHost>;
  private readonly transport: BridgeTransport;
  private readonly allowUrl?: AllowUrl;
  private readonly timeoutMs: number;

  constructor(options: WebViewBridgeClientOptions = {}) {
    this.host = options.transport?.host ?? detectBridgeHost();
    this.transport =
      options.transport ?? createBridgeTransport(this.host, options);
    this.allowUrl = options.allowUrl;
    this.timeoutMs = options.timeoutMs ?? BRIDGE_TIMEOUT_MS;
  }

  /** 응답을 기다리지 않는 단방향 전송 */
  async send(envelope: BridgeEnvelope): Promise<unknown> {
    return this.transport.send(envelope);
  }

  async request<TPayload = unknown, TResult = unknown>(
    method: string,
    payload?: TPayload,
    options: BridgeRequestOptions = {}
  ): Promise<BridgeResult<TResult>> {
    const envelope = createBridgeEnvelope(method, payload);
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const waitsForReply =
      options.expectResponse === true && this.host === "react-native";
    const reply = waitsForReply
      ? waitForResponse(envelope.id, timeoutMs)
      : null;

    try {
      const sent = await withTimeout(this.send(envelope), timeoutMs, method);
      if (!reply) return { envelope, result: sent as TResult };
      const response = await reply;
      return { envelope, result: response.payload as TResult };
    } catch (error) {
      cancelResponse(envelope.id);
      throw error;
    }
  }

  private async stackRequest(
    method: string,
    url: string,
    meta: StackMeta,
    options?: BridgeRequestOptions
  ) {
    const path = assertStackUrl({ url }, this.allowUrl);
    return this.request<StackPushPayload>(method, { url: path, meta }, options);
  }

  stackPush(
    url: string,
    meta: StackMeta = null,
    options?: BridgeRequestOptions
  ) {
    return this.stackRequest(STACK_BRIDGE_METHODS.PUSH, url, meta, options);
  }

  stackReplace(
    url: string,
    meta: StackMeta = null,
    options?: BridgeRequestOptions
  ) {
    return this.stackRequest(STACK_BRIDGE_METHODS.REPLACE, url, meta, options);
  }

  stackPop(options?: BridgeRequestOptions) {
    return this.request(STACK_BRIDGE_METHODS.POP, undefined, options);
  }

  async stackReset(
    url: string,
    meta: StackMeta = null,
    options?: BridgeRequestOptions
  ) {
    const path = assertStackUrl({ url }, this.allowUrl);
    return this.request<StackResetPayload>(
      STACK_BRIDGE_METHODS.RESET,
      { url: path, meta },
      options
    );
  }

  /** web → native 웹 스택 변경 알림 (응답 없음) */
  notifyStackChanged(payload: StackChangedPayload): Promise<unknown> {
    return this.send(
      createBridgeEnvelope(STACK_BRIDGE_METHODS.CHANGED, payload)
    );
  }
}

export function createWebViewBridgeClient(
  options?: WebViewBridgeClientOptions
): WebViewBridgeClient {
  return new WebViewBridgeClient(options);
}
