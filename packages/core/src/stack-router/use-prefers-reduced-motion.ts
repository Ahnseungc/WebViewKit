import { useSyncExternalStore } from "react";
import { prefersReducedMotion, watchReducedMotion } from "./reduced-motion";

/** OS "동작 줄이기" 설정 */
export const usePrefersReducedMotion = (): boolean =>
  useSyncExternalStore(watchReducedMotion, prefersReducedMotion, () => false);
