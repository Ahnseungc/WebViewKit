export const BRIDGE_ERROR_CODES = {
  TIMEOUT: "TIMEOUT",
  BRIDGE_UNAVAILABLE: "BRIDGE_UNAVAILABLE",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  URL_NOT_ALLOWED: "URL_NOT_ALLOWED",
  UNKNOWN_METHOD: "UNKNOWN_METHOD",
  HANDLER_ERROR: "HANDLER_ERROR",
} as const;

export type BridgeErrorCode =
  (typeof BRIDGE_ERROR_CODES)[keyof typeof BRIDGE_ERROR_CODES];

export class BridgeError extends Error {
  readonly code: BridgeErrorCode | string;

  constructor(
    code: BridgeErrorCode | string,
    message: string,
    cause?: unknown
  ) {
    super(message);
    // ES5 타깃에서 Error 상속 시 instanceof 가 깨지는 것 방지
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "BridgeError";
    this.code = code;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }

  toBody() {
    return { code: this.code, message: this.message };
  }
}

export function toBridgeError(
  error: unknown,
  fallbackCode: BridgeErrorCode
): BridgeError {
  if (error instanceof BridgeError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new BridgeError(fallbackCode, message, error);
}
