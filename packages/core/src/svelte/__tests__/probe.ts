import type { SvelteStackRouter } from "../context.svelte.js";

/** 테스트 페이지가 라우터·되살리기 호출을 남기는 곳 */
export const probe: { router: SvelteStackRouter | null; revived: unknown[] } = {
  router: null,
  revived: [],
};
