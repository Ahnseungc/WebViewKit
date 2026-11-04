import { createContext, useContext } from "react";

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
