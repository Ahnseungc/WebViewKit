import { detectBridgeHost, isNativeBridgeHost } from "./detect-host";
import { BRIDGE_ERROR_CODES, BridgeError, toBridgeError } from "./errors";
import { settleResponse } from "./pending-responses";
import {
  BACK_REQUEST_METHOD,
  BRIDGE_RESPONSE_METHOD,
  type BridgeEnvelope,
  createBridgeEnvelope,
  createBridgeResponse,
  parseBridgeMessage,
  STACK_BRIDGE_METHODS,
  type StackMeta,
} from "./protocol";
import {
  createStackRouterBridge,
  type StackRouterBridge,
} from "./stack-router-bridge";
import {
  type BridgeTransportOptions,
  createBridgeTransport,
} from "./transport";
import { type AllowUrl, assertStackUrl } from "./url-policy";

type HandlerResult = boolean | Promise<boolean>;

export type StackRouterHostHandlers = {
  push: (url: string, meta?: StackMeta) => HandlerResult;
  replace: (url: string, meta?: StackMeta) => HandlerResult;
  pop: () => HandlerResult;
  reset: (url: string, meta?: StackMeta) => HandlerResult;
};

export type InstallBridgeHostOptions = {
  /** Native → web stack navigation */
  stack?: StackRouterHostHandlers;
  /** Custom method handlers keyed by envelope `method` */
  handlers?: Record<
    string,
    (payload: unknown, envelope: BridgeEnvelope) => HandlerResult
  >;
  /** native → web `back.request` (하드웨어 back). true = 웹에서 처리함 */
  onBackRequest?: () => HandlerResult;
  /** Called for every valid envelope before routing */
  onMessage?: (envelope: BridgeEnvelope) => void;
  /** 검증 실패·핸들러 예외 (throw 대신 여기로 전달) */
  onError?: (error: BridgeError, envelope?: BridgeEnvelope) => void;
  /** inbound stack URL 검증 (기본 isSafeStackUrl) */
  allowUrl?: AllowUrl;
  /** 모든 inbound 요청에 `bridge.response` 회신 (back.request 는 항상 회신) */
  replyToNative?: boolean;
  /** 회신용 transport 옵션 */
  transport?: BridgeTransportOptions;
  /**
   * `window.stackRouterBridge` 설치 (web → native).
   * true 면 `createStackRouterBridge()` 로 생성한다.
   */
  exposeStackRouterBridge?: StackRouterBridge | boolean;
  /** Register `window.stackPush` / `stackPop` for Flutter native→web (default true when `stack`) */
  legacyInboundHandlers?: boolean;
};

const STACK_URL_METHODS = {
  [STACK_BRIDGE_METHODS.PUSH]: "push",
  [STACK_BRIDGE_METHODS.REPLACE]: "replace",
  [STACK_BRIDGE_METHODS.RESET]: "reset",
} as const;

async function route(
  envelope: BridgeEnvelope,
  options: InstallBridgeHostOptions
): Promise<boolean> {
  const custom = options.handlers?.[envelope.method];
  if (custom) return Boolean(await custom(envelope.payload, envelope));

  if (envelope.method === BACK_REQUEST_METHOD) {
    return Boolean(await options.onBackRequest?.());
  }

  const stack = options.stack;
  const urlMethod =
    STACK_URL_METHODS[envelope.method as keyof typeof STACK_URL_METHODS];
  if (stack && urlMethod) {
    const url = assertStackUrl(envelope.payload, options.allowUrl);
    const meta = (envelope.payload as { meta?: StackMeta }).meta ?? null;
    return Boolean(await stack[urlMethod](url, meta));
  }
  if (stack && envelope.method === STACK_BRIDGE_METHODS.POP) {
    return Boolean(await stack.pop());
  }

  throw new BridgeError(
    BRIDGE_ERROR_CODES.UNKNOWN_METHOD,
    `No handler for ${envelope.method}`
  );
}

async function reply(
  request: BridgeEnvelope,
  result: { handled: boolean; error?: BridgeError },
  options: InstallBridgeHostOptions
) {
  const host = detectBridgeHost();
  if (!isNativeBridgeHost(host)) return;
  const response = createBridgeResponse(request, {
    payload: { handled: result.handled },
    error: result.error?.toBody(),
  });
  try {
    await createBridgeTransport(host, options.transport).send(response);
  } catch (error) {
    options.onError?.(
      toBridgeError(error, BRIDGE_ERROR_CODES.BRIDGE_UNAVAILABLE),
      response
    );
  }
}

async function dispatchEnvelope(
  envelope: BridgeEnvelope,
  options: InstallBridgeHostOptions
): Promise<boolean> {
  if (envelope.method === BRIDGE_RESPONSE_METHOD) {
    return settleResponse(envelope);
  }

  options.onMessage?.(envelope);

  let handled = false;
  let failure: BridgeError | undefined;
  try {
    handled = await route(envelope, options);
  } catch (error) {
    failure = toBridgeError(error, BRIDGE_ERROR_CODES.HANDLER_ERROR);
    options.onError?.(failure, envelope);
  }

  if (options.replyToNative || envelope.method === BACK_REQUEST_METHOD) {
    await reply(envelope, { handled, error: failure }, options);
  }
  return handled;
}

/** inbound 메시지 처리. 절대 reject 하지 않는다 (실패는 false + onError) */
export function handleBridgeMessage(
  raw: string | unknown,
  options: InstallBridgeHostOptions
): Promise<boolean> {
  const envelope = parseBridgeMessage(raw);
  if (!envelope) return Promise.resolve(false);
  return dispatchEnvelope(envelope, options);
}

export type BridgeHostCleanup = () => void;

const isDev = () =>
  typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

type GlobalKey =
  | "webviewkitBridge"
  | "stackPush"
  | "stackReplace"
  | "stackPop"
  | "stackReset"
  | "stackRouterBridge";

function legacyCall(
  method: string,
  payload: unknown,
  options: InstallBridgeHostOptions
): Promise<boolean> {
  return dispatchEnvelope(createBridgeEnvelope(method, payload), {
    ...options,
    replyToNative: false,
  });
}

export function installBridgeHost(
  options: InstallBridgeHostOptions
): BridgeHostCleanup {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const installed: Partial<Record<GlobalKey, unknown>> = {};
  const target = window as unknown as Record<GlobalKey, unknown>;
  const install = (key: GlobalKey, value: unknown) => {
    if (isDev() && target[key] !== undefined) {
      console.warn(`[webviewkit] window.${key} is being overwritten`);
    }
    target[key] = value;
    installed[key] = value;
  };

  install("webviewkitBridge", {
    postMessage: (raw: string | unknown) => {
      void handleBridgeMessage(raw, options);
    },
  });

  if (options.legacyInboundHandlers !== false && options.stack) {
    install("stackPush", (url: string, meta?: StackMeta) =>
      legacyCall(STACK_BRIDGE_METHODS.PUSH, { url, meta }, options)
    );
    install("stackReplace", (url: string, meta?: StackMeta) =>
      legacyCall(STACK_BRIDGE_METHODS.REPLACE, { url, meta }, options)
    );
    install("stackPop", () =>
      legacyCall(STACK_BRIDGE_METHODS.POP, undefined, options)
    );
    install("stackReset", (url: string, meta?: StackMeta) =>
      legacyCall(STACK_BRIDGE_METHODS.RESET, { url, meta }, options)
    );
  }

  const outbound =
    options.exposeStackRouterBridge === true
      ? createStackRouterBridge(options.transport)
      : options.exposeStackRouterBridge || null;
  if (outbound) install("stackRouterBridge", outbound);

  return () => {
    // 다른 설치가 덮어쓴 전역은 건드리지 않는다
    (Object.keys(installed) as GlobalKey[]).forEach((key) => {
      if (target[key] === installed[key]) delete target[key];
    });
  };
}

/** Emit a protocol envelope from web (e.g. for tests or custom native listeners) */
export function emitBridgeEnvelope(
  method: string,
  payload?: unknown
): BridgeEnvelope {
  return createBridgeEnvelope(method, payload);
}
