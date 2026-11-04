import { BRIDGE_ERROR_CODES, BridgeError } from "./errors";
import type { BridgeEnvelope } from "./protocol";

interface PendingRequest {
  resolve: (response: BridgeEnvelope) => void;
  reject: (error: BridgeError) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, PendingRequest>();

/** `bridge.response`(`replyTo === requestId`) 를 timeoutMs 동안 기다린다 */
export function waitForResponse(
  requestId: string,
  timeoutMs: number
): Promise<BridgeEnvelope> {
  return new Promise<BridgeEnvelope>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(
        new BridgeError(
          BRIDGE_ERROR_CODES.TIMEOUT,
          `No response for ${requestId} within ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
    pending.set(requestId, { resolve, reject, timer });
  });
}

/** 응답 envelope 이면 대기 중인 요청을 settle 하고 true */
export function settleResponse(envelope: BridgeEnvelope): boolean {
  if (!envelope.replyTo) return false;
  const request = pending.get(envelope.replyTo);
  if (!request) return false;
  clearTimeout(request.timer);
  pending.delete(envelope.replyTo);
  if (envelope.error) {
    request.reject(
      new BridgeError(envelope.error.code, envelope.error.message)
    );
  } else {
    request.resolve(envelope);
  }
  return true;
}

/** 전송 실패 등으로 대기를 취소 */
export function cancelResponse(requestId: string): void {
  const request = pending.get(requestId);
  if (!request) return;
  clearTimeout(request.timer);
  pending.delete(requestId);
}
