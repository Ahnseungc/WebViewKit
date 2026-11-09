import { createContext, useContext, useEffect, useRef } from "react";

export interface ActivityContextValue {
  key: string;
  path: string;
  pattern: string;
  params: Record<string, string>;
  query: Record<string, string>;
  data?: unknown;
  /** 스택 내 위치 (0 = root) */
  index: number;
  isTop: boolean;
  /** keepAlive 로 보관 중인 페이지 (스택에서는 빠졌지만 마운트 유지) */
  isCached: boolean;
}

export const ActivityContext = createContext<ActivityContextValue | null>(null);

/** 현재 페이지(Activity) 자신의 path·params·query·data */
export function useActivity(): ActivityContextValue {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error(
      "useActivity must be used inside a StackRouterProvider page"
    );
  }
  return context;
}

/** `/detail/:id` → `{ id }` */
export function useParams<
  TParams extends Record<string, string> = Record<string, string>,
>(): TParams {
  return useActivity().params as TParams;
}

/** 보관(cached) 중이던 페이지가 되살아난 직후 1회 호출. 첫 마운트에는 호출하지 않는다 */
export function useOnRevive(callback: (data: unknown) => void): void {
  const { isCached, data } = useActivity();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const wasCachedRef = useRef(isCached);

  useEffect(() => {
    if (wasCachedRef.current && !isCached) callbackRef.current(data);
    wasCachedRef.current = isCached;
  }, [isCached, data]);
}
