import type { SvelteKitStack } from "../context.js";

/** 테스트 페이지가 useStack() 을 남기는 곳 */
export const probe: { stack: SvelteKitStack | null } = { stack: null };
