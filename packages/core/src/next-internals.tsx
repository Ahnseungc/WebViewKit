/**
 * Next App Router 내부 컨텍스트. 공개 API 로는 "들어올 때의 라우터 값" 을 다시 제공할 수 없어
 * 이 모듈 한 곳에서만 내부 경로를 읽는다 (Next 16.4 에서 확인).
 *
 * - `LayoutRouterContext`: layout 의 `children` 슬롯(OuterLayoutRouter)이 그릴 세그먼트 트리.
 *   고정하면 덮인 페이지가 들어올 때의 서버 컴포넌트 결과를 계속 그린다
 * - `PathnameContext`·`PathParamsContext`·`SearchParamsContext`: `usePathname`·`useParams`·`useSearchParams`
 * - `NavigationPromisesContext`: 개발 모드에서 위 훅들이 대신 읽는 값 (없는 버전이면 건너뜀)
 */
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import * as hooksContexts from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import React, { type ContextType, type ReactNode, useContext } from "react";

const { PathnameContext, PathParamsContext, SearchParamsContext } =
  hooksContexts;
const NavigationPromisesContext = (
  hooksContexts as Partial<typeof hooksContexts>
).NavigationPromisesContext;

/** 한 시점의 Next 라우터 값과 layout children */
export interface NextRouterSnapshot {
  children: ReactNode;
  layoutRouter: ContextType<typeof LayoutRouterContext>;
  pathname: ContextType<typeof PathnameContext>;
  params: ContextType<typeof PathParamsContext>;
  searchParams: ContextType<typeof SearchParamsContext>;
  navigationPromises: unknown;
}

const useOptionalContext = (context: React.Context<unknown> | undefined) =>
  // ponytail: context 유무는 모듈 로드 시 고정이라 훅 호출 순서가 바뀌지 않는다
  context ? useContext(context) : null;

/** 지금 렌더의 라우터 값. `useSearchParams()` 를 부르지 않으므로 정적 렌더를 CSR 로 떨어뜨리지 않는다 */
export function useNextRouterSnapshot(children: ReactNode): NextRouterSnapshot {
  return {
    children,
    layoutRouter: useContext(LayoutRouterContext),
    pathname: useContext(PathnameContext),
    params: useContext(PathParamsContext),
    searchParams: useContext(SearchParamsContext),
    navigationPromises: useOptionalContext(
      NavigationPromisesContext as React.Context<unknown> | undefined
    ),
  };
}

/** pathname + search. 같은 URL 이면 같은 history 항목으로 본다 */
export const snapshotPath = ({
  pathname,
  searchParams,
}: NextRouterSnapshot) => {
  const search = searchParams?.toString() ?? "";
  return `${pathname ?? ""}${search ? `?${search}` : ""}`;
};

const ProvideNavigationPromises = ({
  value,
  children,
}: {
  value: unknown;
  children: ReactNode;
}) => {
  if (!NavigationPromisesContext) return <>{children}</>;
  const Provider = (NavigationPromisesContext as React.Context<unknown>)
    .Provider;
  return <Provider value={value}>{children}</Provider>;
};

/** 스냅샷 시점의 라우터 값으로 children 을 그린다 */
export const FrozenNextRouter = ({
  snapshot,
}: {
  snapshot: NextRouterSnapshot;
}) => (
  <PathnameContext.Provider value={snapshot.pathname}>
    <PathParamsContext.Provider value={snapshot.params}>
      <SearchParamsContext.Provider value={snapshot.searchParams}>
        <ProvideNavigationPromises value={snapshot.navigationPromises}>
          <LayoutRouterContext.Provider value={snapshot.layoutRouter}>
            {snapshot.children}
          </LayoutRouterContext.Provider>
        </ProvideNavigationPromises>
      </SearchParamsContext.Provider>
    </PathParamsContext.Provider>
  </PathnameContext.Provider>
);
