/**
 * `@ahnseungchan/webviewkit/svelte` — `/core` 위의 Svelte 5 바인딩.
 * `.svelte` 원본으로 배포되어 앱의 Svelte 컴파일러가 컴파일한다
 */
export { default as BackRouter } from "./BackRouter.svelte";
export {
  type Current,
  type SvelteStackRouter,
  useActivity,
  useOnRevive,
  useOptionalStackRouter,
  useParams,
  useStackRouter,
} from "./context.svelte.js";
export { default as StackHeader } from "./StackHeader.svelte";
export { default as StackRouter } from "./StackRouter.svelte";
export type { StackRouterProps, SvelteActivity } from "./types.js";
