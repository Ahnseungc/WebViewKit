"use client";
/**
 * React 진입점. 훅·컨텍스트를 쓰므로 Next.js 서버 컴포넌트에서는 클라이언트 경계로 다룬다.
 * 서버에서 쓸 유틸(matchPath·history 등)은 `@ahnseungchan/webviewkit/core` 에서 가져온다
 */
export * from "./bridge";
export {
  BACK_TIMEOUT_MS,
  BRIDGE_TIMEOUT_MS,
  KEEP_ALIVE_LIMIT,
  STACK_TRANSITION_MS,
} from "./constants";
export { history } from "./history";
export type {
  Activity,
  StackRouterProviderProps,
  VisiblePage,
} from "./react-types";
export { StackDevRoadmap } from "./stack-dev/stack-dev-roadmap";
export { default as BackRouter } from "./stack-router/_components/back-router";
export { default as StackHeader } from "./stack-router/_components/header";
export {
  type ActivityContextValue,
  useActivity,
  useOnRevive,
  useParams,
} from "./stack-router/activity-context";
export type { StackBridgeSyncOptions } from "./stack-router/bridge-sync";
export { findActivity, matchPath, parseQuery } from "./stack-router/match-path";
export type { StackEntry } from "./stack-router/stack-reducer";
export {
  type StackRouterContextValue,
  default as StackRouterProvider,
  useOptionalStackRouter,
  useStackRouter,
} from "./stack-router/stack-router-provider";
export type {
  ActivityRoute,
  DirectionType,
  HistoryListener,
  HistoryState,
  PopStateTransition,
  RestoreStackPolicy,
  StackTransitionType,
} from "./type";
export { Direction, HistoryAction } from "./type";
