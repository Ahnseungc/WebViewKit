import { getContext, untrack } from "svelte";
import type {
  ActivityInfo,
  HistoryState,
  StackEntry,
  StackNavigatorActions,
} from "../core.js";

/** `useStackRouter()` 값. 필드가 getter 라 템플릿·$derived 에서 읽으면 반응한다 (구조 분해하면 끊긴다) */
export interface SvelteStackRouter
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

/** Svelte 5 관례대로 `.current` 로 읽는 반응형 값 */
export interface Current<T> {
  readonly current: T;
}

export const STACK_ROUTER_KEY = Symbol("webviewkit-stack-router");
export const ACTIVITY_KEY = Symbol("webviewkit-activity");

/** StackRouter 밖이면 null. 스택 안·밖에서 같이 쓰는 링크에서 쓴다 (컴포넌트 초기화 중에만 호출) */
export const useOptionalStackRouter = () =>
  getContext<SvelteStackRouter | undefined>(STACK_ROUTER_KEY) ?? null;

export function useStackRouter(): SvelteStackRouter {
  const router = useOptionalStackRouter();
  if (!router) {
    throw new Error("useStackRouter must be used within a StackRouter");
  }
  return router;
}

const optionalActivity = () =>
  getContext<Current<ActivityInfo> | undefined>(ACTIVITY_KEY);

/** 현재 페이지(Activity) 자신의 path·params·query·data (`activity.current`) */
export function useActivity(): Current<ActivityInfo> {
  const activity = optionalActivity();
  if (!activity) {
    throw new Error("useActivity must be used inside a StackRouter page");
  }
  return activity;
}

/** `/detail/:id` → `params.current.id` */
export function useParams<
  TParams extends Record<string, string> = Record<string, string>,
>(): Current<TParams> {
  const activity = useActivity();
  return {
    get current() {
      return activity.current.params as TParams;
    },
  };
}

/**
 * 이 페이지 인스턴스가 새 data 로 재사용될 때마다 1회 호출: 보관본이 되살아날 때,
 * resetPush 가 스택 안 인스턴스를 재사용할 때. 첫 마운트에는 호출하지 않는다.
 * 스택 밖에서 쓰면 아무것도 하지 않는다
 */
export function useOnRevive(callback: (data: unknown) => void): void {
  const activity = optionalActivity();
  if (!activity) return;
  let last = untrack(() => activity.current.revision);
  $effect(() => {
    const { revision } = activity.current;
    if (revision > last) {
      untrack(() => callback(activity.current.data));
    }
    last = revision;
  });
}
