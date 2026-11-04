import { detectBridgeHost } from "./detect-host";
import { BRIDGE_ERROR_CODES, toBridgeError } from "./errors";
import type { BridgeEnvelope, BridgeHostKind } from "./protocol";
import {
  FLUTTER_LEGACY_STACK_HANDLERS,
  FLUTTER_UNIFIED_HANDLER,
  serializeBridgeMessage,
  STACK_BRIDGE_METHODS,
} from "./protocol";

export type BridgeTransportOptions = {
  /** Flutter: use stackPush/stackPop handlers (default true) */
  flutterLegacyHandlers?: boolean;
};

export interface BridgeTransport {
  readonly host: BridgeHostKind;
  /** Flutter 는 callHandler 반환값, RN·browser 는 undefined */
  send(envelope: BridgeEnvelope): Promise<unknown>;
}

const LEGACY_HANDLER_BY_METHOD: Record<string, string> = {
  [STACK_BRIDGE_METHODS.PUSH]: FLUTTER_LEGACY_STACK_HANDLERS.push,
  [STACK_BRIDGE_METHODS.REPLACE]: FLUTTER_LEGACY_STACK_HANDLERS.replace,
  [STACK_BRIDGE_METHODS.POP]: FLUTTER_LEGACY_STACK_HANDLERS.pop,
  [STACK_BRIDGE_METHODS.RESET]: FLUTTER_LEGACY_STACK_HANDLERS.reset,
};

function unavailable(host: BridgeHostKind): never {
  throw new Error(`${host} bridge is not available`);
}

function createReactNativeTransport(): BridgeTransport {
  return {
    host: "react-native",
    async send(envelope) {
      try {
        const bridge = window.ReactNativeWebView ?? unavailable("react-native");
        bridge.postMessage(serializeBridgeMessage(envelope));
        return undefined;
      } catch (error) {
        throw toBridgeError(error, BRIDGE_ERROR_CODES.BRIDGE_UNAVAILABLE);
      }
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
      const bridge = window.flutter_inappwebview;
      if (!bridge?.callHandler) {
        throw toBridgeError(
          new Error("flutter bridge is not available"),
          BRIDGE_ERROR_CODES.BRIDGE_UNAVAILABLE
        );
      }
      const call = bridge.callHandler.bind(bridge);
      const handler = useLegacy
        ? LEGACY_HANDLER_BY_METHOD[envelope.method]
        : null;
      if (!handler) {
        return call(FLUTTER_UNIFIED_HANDLER, serializeBridgeMessage(envelope));
      }
      if (envelope.method === STACK_BRIDGE_METHODS.POP) {
        return call(handler);
      }
      const payload = envelope.payload as
        | { url?: string; meta?: unknown }
        | undefined;
      return call(handler, payload?.url ?? "", payload?.meta ?? null);
    },
  };
}

const browserTransport: BridgeTransport = {
  host: "browser",
  async send() {
    // no native host — web-only
    return undefined;
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
