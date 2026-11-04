import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const getMediaQuery = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(QUERY)
    : null;

/** OS "동작 줄이기" 설정 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => getMediaQuery()?.matches ?? false
  );

  useEffect(() => {
    const mediaQuery = getMediaQuery();
    if (!mediaQuery) return;
    const onChange = () => setReduced(mediaQuery.matches);
    mediaQuery.addEventListener?.("change", onChange);
    return () => mediaQuery.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}
