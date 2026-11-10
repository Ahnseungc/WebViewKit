const QUERY = "(prefers-reduced-motion: reduce)";

const getMediaQuery = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(QUERY)
    : null;

/** OS "동작 줄이기" 설정 */
export const prefersReducedMotion = (): boolean =>
  getMediaQuery()?.matches ?? false;

/** 설정이 바뀔 때마다 호출. 반환값은 구독 해제 */
export function watchReducedMotion(
  listener: (reduced: boolean) => void
): () => void {
  const mediaQuery = getMediaQuery();
  if (!mediaQuery) return () => {};
  const onChange = () => listener(mediaQuery.matches);
  mediaQuery.addEventListener?.("change", onChange);
  return () => mediaQuery.removeEventListener?.("change", onChange);
}
