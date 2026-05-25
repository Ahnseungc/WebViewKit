import {
  createBridgeEnvelope,
  parseBridgeMessage,
  STACK_BRIDGE_METHODS,
  type BridgeEnvelope,
  type StackMeta,
} from "./protocol";
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
  handlers?: Record<
    string,
    (payload: unknown, envelope: BridgeEnvelope) => boolean | Promise<boolean>
  >;
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

async function dispatchEnvelope(
  envelope: BridgeEnvelope,
  options: InstallBridgeHostOptions
): Promise<boolean> {
  options.onMessage?.(envelope);

  const custom = options.handlers?.[envelope.method];
  if (custom) {
    return Boolean(await custom(envelope.payload, envelope));
  }

  const stack = options.stack;
  if (!stack) return false;

  const payload = envelope.payload as
    | { url?: string; meta?: StackMeta }
    | undefined;

  switch (envelope.method) {
    case STACK_BRIDGE_METHODS.PUSH:
      if (!payload?.url) return false;
      return Boolean(await stack.push(payload.url, payload.meta ?? null));
    case STACK_BRIDGE_METHODS.REPLACE:
      if (!payload?.url) return false;
      return Boolean(await stack.replace(payload.url, payload.meta ?? null));
    case STACK_BRIDGE_METHODS.POP:
      return Boolean(await stack.pop());
    case STACK_BRIDGE_METHODS.RESET:
      if (!payload?.url) return false;
      return Boolean(await stack.reset(payload.url, payload.meta ?? null));
    default:
      return false;
  }
}

export function handleBridgeMessage(
  raw: string | unknown,
  options: InstallBridgeHostOptions
): Promise<boolean> {
  const envelope = parseBridgeMessage(raw);
  if (!envelope) return Promise.resolve(false);
  return dispatchEnvelope(envelope, options);
}

export type BridgeHostCleanup = () => void;

export function installBridgeHost(
  options: InstallBridgeHostOptions
): BridgeHostCleanup {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const inbound = (raw: string | unknown) => {
    void handleBridgeMessage(raw, options);
  };

  window.webviewkitBridge = { postMessage: inbound };

  if (options.legacyInboundHandlers !== false && options.stack) {
    const { stack } = options;
    window.stackPush = (url, meta) =>
      Promise.resolve(stack.push(url, meta ?? null)).then(Boolean);
    window.stackReplace = (url, meta) =>
      Promise.resolve(stack.replace(url, meta ?? null)).then(Boolean);
    window.stackPop = () => Promise.resolve(stack.pop()).then(Boolean);
    window.stackReset = (url, meta) =>
      Promise.resolve(stack.reset(url, meta ?? null)).then(Boolean);
  }

  if (options.exposeStackRouterBridge) {
    if (typeof options.exposeStackRouterBridge === "object") {
      window.stackRouterBridge = options.exposeStackRouterBridge;
    }
  }

  return () => {
    delete window.webviewkitBridge;
    delete window.stackPush;
    delete window.stackReplace;
    delete window.stackPop;
    delete window.stackReset;
    if (options.exposeStackRouterBridge) {
      delete window.stackRouterBridge;
    }
  };
}

/** Emit a protocol envelope from web (e.g. for tests or custom native listeners) */
export function emitBridgeEnvelope(
  method: string,
  payload?: unknown
): BridgeEnvelope {
  return createBridgeEnvelope(method, payload);
}
