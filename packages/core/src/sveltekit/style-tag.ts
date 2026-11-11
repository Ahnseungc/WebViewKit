import { stackStyles, STYLE_ATTRIBUTE } from "../core.js";

/**
 * 루트에 `{@html}` 로 그리는 스택 CSS 태그. SSR HTML 에 들어가 첫 페인트부터 스타일이 적용된다
 * (ensureStackStyles 는 이 태그가 있으면 건너뛴다).
 * .svelte 안 문자열에 style 태그를 쓰면 전처리기가 컴포넌트 CSS 로 잘못 읽어 SSR 값이 바뀌므로 .ts 에 둔다
 */
export const stackStyleTag = `<style ${STYLE_ATTRIBUTE}="">${stackStyles}</style>`;
