/**
 * `@ahnseungchan/webviewkit/core` — 프레임워크 무관 진입점 (React 를 import 하지 않는다).
 * Vue·Svelte·vanilla 바인딩은 navigator 를 구독해 `createPageLayout` 결과를 그리고,
 * 페이지 요소에 `getStackPageAttributes` 를 붙인다.
 */
export * from "./bridge/core";
export {
  BACK_TIMEOUT_MS,
  BRIDGE_TIMEOUT_MS,
  KEEP_ALIVE_LIMIT,
  STACK_TRANSITION_MS,
} from "./constants";
export { history } from "./history";
export {
  connectStackBridge,
  type ConnectStackBridgeOptions,
  type StackBridgeSyncOptions,
} from "./stack-router/bridge-sync";
export { findActivity, matchPath, parseQuery } from "./stack-router/match-path";
export {
  createStackNavigator,
  type StackNavigator,
  type StackNavigatorActions,
  type StackNavigatorOptions,
} from "./stack-router/navigator";
export {
  createPageLayout,
  type PageLayoutOptions,
  type StackPageLayout,
  toActivityInfo,
} from "./stack-router/page-layout";
export {
  prefersReducedMotion,
  watchReducedMotion,
} from "./stack-router/reduced-motion";
export type {
  PageState,
  StackEntry,
  StackState,
  StackTransition,
} from "./stack-router/stack-reducer";
export {
  ensureStackStyles,
  getStackPageAttributes,
  hasPendingAnimation,
  isOwnPageAnimation,
  type StackPageAttributeOptions,
  stackStyles,
} from "./stack-router/styles";
export type {
  ActivityInfo,
  ActivityRoute,
  DirectionType,
  HistoryListener,
  HistoryState,
  PopStateTransition,
  RestoreStackPolicy,
  StackTransitionType,
} from "./type";
export { Direction, HistoryAction } from "./type";
