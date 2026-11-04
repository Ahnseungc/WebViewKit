import { BRIDGE_ERROR_CODES, BridgeError } from "./errors";

export type AllowUrl = (url: string) => boolean;

/**
 * 기본 정책: 같은 앱 안의 경로만 허용.
 * - `/a/b?x=1` 같은 상대 경로 (`//host` 프로토콜 상대 URL 제외)
 * - 현재 origin 과 같은 절대 http(s) URL
 * `javascript:`, `data:`, 외부 도메인은 거부한다.
 */
export function isSafeStackUrl(url: string): boolean {
  if (url.startsWith("/"))
    return !url.startsWith("//") && !url.startsWith("/\\");
  if (typeof window === "undefined") return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.origin === window.location.origin
    );
  } catch {
    return false;
  }
}

/** 같은 origin 절대 URL → 경로로 정규화. 그 밖(상대 경로·커스텀 스킴)은 그대로 */
export function toStackPath(url: string): string {
  if (url.startsWith("/") || typeof window === "undefined") return url;
  try {
    const parsed = new URL(url);
    if (parsed.origin !== window.location.origin) return url;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

/** payload 에서 url 을 꺼내 형식·정책 검증 후 경로로 반환. 실패 시 BridgeError */
export function assertStackUrl(
  payload: unknown,
  allowUrl: AllowUrl = isSafeStackUrl
): string {
  const url = (payload as { url?: unknown } | undefined)?.url;
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new BridgeError(
      BRIDGE_ERROR_CODES.INVALID_PAYLOAD,
      "payload.url must be a non-empty string"
    );
  }
  if (!allowUrl(url)) {
    throw new BridgeError(
      BRIDGE_ERROR_CODES.URL_NOT_ALLOWED,
      `url is not allowed: ${url}`
    );
  }
  return toStackPath(url);
}
