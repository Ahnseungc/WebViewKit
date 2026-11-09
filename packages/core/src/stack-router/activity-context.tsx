import { createContext, useContext, useEffect, useRef } from "react";

export interface ActivityContextValue {
  key: string;
  path: string;
  pattern: string;
  params: Record<string, string>;
  query: Record<string, string>;
  data?: unknown;
  /** 스택 내 위치 (0 = root). 퇴장 중이면 빠지기 전 위치, 보관 중이면 -1 */
  index: number;
  isTop: boolean;
  /** keepAlive 로 보관 중인 페이지 (스택에서는 빠졌지만 마운트 유지) */
  isCached: boolean;
  /** 이 인스턴스가 새 data 로 재사용(보관본 되살리기·resetPush 재사용)된 횟수 */
  revision: number;
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

/**
 * 이 페이지 인스턴스가 새 data 로 재사용될 때마다 1회 호출: 보관본이 되살아날 때,
 * resetPush 가 스택 안 인스턴스를 재사용할 때. 첫 마운트에는 호출하지 않는다.
 * 스택 밖에서 렌더되면 아무것도 하지 않는다 (스택 안·밖 공용 화면에서 그대로 쓸 수 있게)
 */
export function useOnRevive(callback: (data: unknown) => void): void {
  const activity = useContext(ActivityContext);
  const revision = activity?.revision ?? 0;
  const data = activity?.data;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const lastRevisionRef = useRef(revision);

  useEffect(() => {
    if (revision > lastRevisionRef.current) callbackRef.current(data);
    lastRevisionRef.current = revision;
  }, [revision, data]);
}
