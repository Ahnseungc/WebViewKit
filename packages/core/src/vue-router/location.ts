import {
  isNavigationFailure,
  type RouteLocationNormalizedLoaded,
  type Router,
  START_LOCATION,
} from "vue-router";
import type { RouterLocation } from "../stack-router/router-stack";

/** Vue Router(web history)가 history.state 에 남기는 값. 서버·memory history 에선 없다 */
interface VueRouterHistoryState {
  position?: number;
  replaced?: boolean;
}

const readHistoryState = (): VueRouterHistoryState | null =>
  typeof window === "undefined"
    ? null
    : (window.history.state as VueRouterHistoryState | null);

export const historyPosition = () => readHistoryState()?.position;

/** location → 스택 path (hash 는 같은 화면으로 본다) */
export const toStackPath = (route: RouteLocationNormalizedLoaded) =>
  route.fullPath.replace(/#.*$/, "");

/**
 * Vue Router 는 location key 가 없어 history 위치(`history.state.position`)마다 key 를 만든다.
 * 브라우저 history 처럼 push 하면 그 위치부터 앞쪽 key 를 버리고, back/forward 는 기억한 key 를 다시 쓴다.
 * 새로고침하면 기억이 없으므로 처음 보는 위치는 새 key 가 된다 (index 로 방향을 가린다)
 */
export function createLocationKeys() {
  const keyByPosition = new Map<number, string>();
  let nextId = 0;
  const fresh = () => `wvk-${nextId++}`;

  const assign = (position: number | undefined) => {
    const key = fresh();
    if (position !== undefined) keyByPosition.set(position, key);
    return key;
  };

  return {
    initial: assign,
    next: (action: RouterLocation["action"], position: number | undefined) => {
      if (position === undefined) return fresh();
      const known = keyByPosition.get(position);
      if (action === "pop" && known) return known;
      if (action === "push") {
        keyByPosition.forEach((_, item) => {
          if (item > position) keyByPosition.delete(item);
        });
      }
      return assign(position);
    },
  };
}

export type LocationListener = (
  action: RouterLocation["action"],
  route: RouteLocationNormalizedLoaded,
  position: number | undefined,
  /** START_LOCATION 에서 온 첫 이동 (마운트가 router.isReady 보다 빨랐을 때) */
  isInitial: boolean
) => void;

/**
 * 확정된 이동마다 push/replace/pop 을 알려 준다. 반환값은 구독 해제.
 * - pop: `history.listen` (popstate 에만 불린다) 직후의 afterEach
 * - replace: 새 history.state 의 `replaced` (router.replace 만 true 로 남긴다)
 * - 첫 이동(START_LOCATION 에서)은 마운트 전에 끝나지 않았을 때만 오며 replace 로 본다
 */
export function listenRouterLocations(
  router: Router,
  listener: LocationListener
): () => void {
  let popPending = false;
  const stopHistory = router.options.history.listen((_to, _from, info) => {
    popPending = info.type === "pop";
  });
  const stopAfterEach = router.afterEach((to, from, failure) => {
    const isPop = popPending;
    popPending = false;
    if (isNavigationFailure(failure)) return;
    const state = readHistoryState();
    const isInitial = from === START_LOCATION;
    const action: RouterLocation["action"] = isPop
      ? "pop"
      : isInitial || state?.replaced
        ? "replace"
        : "push";
    listener(action, to, state?.position, isInitial);
  });
  return () => {
    stopHistory();
    stopAfterEach();
  };
}
