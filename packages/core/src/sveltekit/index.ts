/**
 * `@ahnseungchan/webviewkit/sveltekit` — SvelteKit 위에 스택 전환을 얹는다.
 * URL·history·load(SSR 포함)는 SvelteKit 이 맡고, `+layout.svelte` 의 `<StackLayout>` 이 페이지를 쌓아 그린다.
 * `$app/*` 를 import 하므로 SvelteKit 앱에서만 쓴다 (일반 Svelte 앱은 `/svelte`)
 */
export { type SvelteKitStack, useStack, useStackPage } from "./context.js";
export { default as StackLayout } from "./StackLayout.svelte";
export type { StackLayoutProps, StackPageSnapshot } from "./types.js";
