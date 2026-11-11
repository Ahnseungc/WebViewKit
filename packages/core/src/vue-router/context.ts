import { inject, type InjectionKey } from "vue";
import type { RouterStackActions } from "../stack-router/router-stack-actions";

/** `useStack()` 값. reactive 라 `stack.depth` 처럼 바로 읽는다 (구조 분해하면 반응성이 끊긴다) */
export interface VueRouterStack extends RouterStackActions {
  readonly depth: number;
  readonly canGoBack: boolean;
  readonly isTransitioning: boolean;
}

export const RouterStackKey: InjectionKey<VueRouterStack> = Symbol(
  "webviewkit-router-stack"
);

/** `<StackRouterView>` 안에서 스택 깊이와 이동 함수 */
export function useStack(): VueRouterStack {
  const stack = inject(RouterStackKey, null);
  if (!stack) {
    throw new Error("useStack must be used within a StackRouterView");
  }
  return stack;
}
