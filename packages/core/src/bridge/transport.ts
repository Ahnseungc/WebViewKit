import { detectBridgeHost } from "./detect-host";
import type { BridgeEnvelope, BridgeHostKind } from "./protocol";
import {
  FLUTTER_LEGACY_STACK_HANDLERS,
  FLUTTER_UNIFIED_HANDLER,
  STACK_BRIDGE_METHODS,
  serializeBridgeMessage,
} from "./protocol";

export type BridgeTransportOptions = {
  /** Flutter: use stackPush/stackPop handlers (default true) */
  flutterLegacyHandlers?: boolean;
};

export interface BridgeTransport {
  readonly host: BridgeHostKind;
  send(envelope: BridgeEnvelope): Promise<void>;
}

function stackMethodToLegacyHandler(method: string): string | null {
  switch (method) {
    case STACK_BRIDGE_METHODS.PUSH:
      return FLUTTER_LEGACY_STACK_HANDLERS.push;
    case STACK_BRIDGE_METHODS.REPLACE:
      return FLUTTER_LEGACY_STACK_HANDLERS.replace;
    case STACK_BRIDGE_METHODS.POP:
      return FLUTTER_LEGACY_STACK_HANDLERS.pop;
    case STACK_BRIDGE_METHODS.RESET:
      return FLUTTER_LEGACY_STACK_HANDLERS.reset;
    default:
      return null;
  }
}

function createReactNativeTransport(): BridgeTransport {
  return {
    host: "react-native",
    async send(envelope) {
      window.ReactNativeWebView!.postMessage(serializeBridgeMessage(envelope));
    },
  };
}

function createFlutterTransport(
  options: BridgeTransportOptions
): BridgeTransport {
  const useLegacy = options.flutterLegacyHandlers !== false;

  return {
    host: "flutter",
    async send(envelope) {
      const call = window.flutter_inappwebview!.callHandler.bind(
        window.flutter_inappwebview
      );

      if (useLegacy) {
        const handler = stackMethodToLegacyHandler(envelope.method);
        if (handler) {
          const payload = envelope.payload as
            | { url?: string; meta?: unknown }
            | undefined;
          if (envelope.method === STACK_BRIDGE_METHODS.POP) {
            await call(handler);
            return;
          }
          const url = payload?.url ?? "";
          const meta =
            payload && "meta" in payload ? payload.meta ?? null : null;
          await call(handler, url, meta);
          return;
        }
      }

      await call(FLUTTER_UNIFIED_HANDLER, serializeBridgeMessage(envelope));
    },
  };
}

const browserTransport: BridgeTransport = {
  host: "browser",
  async send() {
    /* no native host — web-only */
  },
};

export function createBridgeTransport(
  host: BridgeHostKind = detectBridgeHost(),
  options: BridgeTransportOptions = {}
): BridgeTransport {
  if (host === "react-native") return createReactNativeTransport();
  if (host === "flutter") return createFlutterTransport(options);
  return browserTransport;
}
