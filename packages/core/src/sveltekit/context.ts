import { getContext } from "svelte";
import type { RouterStackActions } from "../core.js";
import type { StackPageSnapshot } from "./types.js";

import { page } from "$app/state";

/** `useStack()` 값. 필드가 getter 라 템플릿·$derived 에서 읽으면 반응한다 (구조 분해하면 끊긴다) */
export interface SvelteKitStack extends RouterStackActions {
  readonly depth: number;
  readonly canGoBack: boolean;
  readonly isTransitioning: boolean;
}

export const STACK_KEY = Symbol("webviewkit-sveltekit-stack");
export const STACK_PAGE_KEY = Symbol("webviewkit-sveltekit-page");

/** `<StackLayout>` 안에서 스택 깊이와 이동 함수 (컴포넌트 초기화 중에만 호출) */
export function useStack(): SvelteKitStack {
  const stack = getContext<SvelteKitStack | undefined>(STACK_KEY);
  if (!stack) throw new Error("useStack must be used within a StackLayout");
  return stack;
}

/**
 * 이 페이지 자신의 `page` 값 (`$app/state` page 와 같은 모양).
 * `$app/state` 의 page 는 언제나 지금 URL 이라, 덮이거나 나가는 페이지가 읽으면 다음 페이지 값이 보인다.
 * 이걸로 읽으면 그 페이지가 top 이던 때의 url·params·data 로 고정된다. 스택 페이지 밖이면 `$app/state` page
 */
export function useStackPage(): Readonly<StackPageSnapshot> {
  return getContext<StackPageSnapshot | undefined>(STACK_PAGE_KEY) ?? page;
}
