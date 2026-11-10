import {
  computed,
  type ComputedRef,
  inject,
  type InjectionKey,
  type Ref,
  watch,
} from "vue";
import type { StackNavigatorActions } from "../stack-router/navigator";
import type { StackEntry } from "../stack-router/stack-reducer";
import type { ActivityInfo, HistoryState } from "../type";

/** `useStackRouter()` 값. reactive 라 `router.depth` 처럼 바로 읽는다 (구조 분해하면 반응성이 끊긴다) */
export interface VueStackRouter
  extends Omit<
    StackNavigatorActions,
    "endTransition" | "awaitTransitionStart" | "onTransitionStart"
  > {
  readonly currentPath: string;
  /** top 엔트리의 history state */
  readonly currentState: HistoryState;
  readonly depth: number;
  readonly canGoBack: boolean;
  readonly isTransitioning: boolean;
  readonly entries: StackEntry[];
}

export const StackRouterKey: InjectionKey<VueStackRouter> = Symbol(
  "webviewkit-stack-router"
);
export const ActivityKey: InjectionKey<Ref<ActivityInfo>> = Symbol(
  "webviewkit-activity"
);

/** StackRouter 밖이면 null. 스택 안·밖에서 같이 쓰는 링크·컴포저블에서 쓴다 */
export const useOptionalStackRouter = () => inject(StackRouterKey, null);

export function useStackRouter(): VueStackRouter {
  const router = useOptionalStackRouter();
  if (!router) {
    throw new Error("useStackRouter must be used within a StackRouter");
  }
  return router;
}

/** 현재 페이지(Activity) 자신의 path·params·query·data */
export function useActivity(): Readonly<Ref<ActivityInfo>> {
  const activity = inject(ActivityKey, null);
  if (!activity) {
    throw new Error("useActivity must be used inside a StackRouter page");
  }
  return activity;
}

/** `/detail/:id` → `{ id }` */
export function useParams<
  TParams extends Record<string, string> = Record<string, string>,
>(): ComputedRef<TParams> {
  const activity = useActivity();
  return computed(() => activity.value.params as TParams);
}

/**
 * 이 페이지 인스턴스가 새 data 로 재사용될 때마다 1회 호출: 보관본이 되살아날 때,
 * resetPush 가 스택 안 인스턴스를 재사용할 때. 첫 마운트에는 호출하지 않는다.
 * 스택 밖에서 쓰면 아무것도 하지 않는다
 */
export function useOnRevive(callback: (data: unknown) => void): void {
  const activity = inject(ActivityKey, null);
  if (!activity) return;
  watch(
    () => activity.value.revision,
    (revision, previous) => {
      if (revision > previous) callback(activity.value.data);
    }
  );
}
