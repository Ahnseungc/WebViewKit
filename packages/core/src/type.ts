import type React from "react";
import type { StackBridgeSyncOptions } from "./stack-router/use-stack-bridge-sync";

export interface Activity {
  /** 정적 경로 또는 동적 세그먼트 패턴 (`/detail/:id`) */
  path: string;
  element: React.ReactNode;
  /** true 면 스택에서 빠져도 인스턴스(state)를 보관했다가 같은 path 로 돌아오면 되살린다 */
  keepAlive?: boolean;
}

export type StackTransitionType = "slide" | "fade" | "none";

export type RestoreStackPolicy = "with-root" | "top-only";

export interface StackRouterProviderProps {
  initialActivity: Activity;
  Activities?: Activity[];
  maxWidth?: string;
  /** true면 각 페이지 상단에 `StackHeader` 렌더 (페이지와 함께 전환) */
  isShowHeader?: boolean;
  /** 개발 시 스택 로드맵 오버레이 (기본: NODE_ENV === "development") */
  enableDevTools?: boolean;
  transition?: StackTransitionType;
  /** 전환 시간 ms (기본 STACK_TRANSITION_MS) */
  duration?: number;
  /** 새로고침·딥링크 진입 시 스택 복원 정책 (기본 "with-root") */
  restoreStack?: RestoreStackPolicy;
  /** keepAlive 페이지 최대 보관 수 (기본 KEEP_ALIVE_LIMIT, 0 이면 보관 안 함) */
  keepAliveLimit?: number;
  /** env(safe-area-inset-*) padding 적용 */
  safeArea?: boolean;
  /** 루트에서 back 했을 때 (앱 종료·WebView 닫기 위임) */
  onBackAtRoot?: () => void;
  /** 등록되지 않은 경로로 이동하려 할 때 */
  onNotFound?: (path: string) => void;
  /** 네이티브 브릿지 연동 */
  bridge?: boolean | StackBridgeSyncOptions;
}

export interface VisiblePage {
  path: string;
  element: React.ReactNode;
}

export enum Direction {
  FORWARD = "forward",
  BACKWARD = "backward",
}

export type DirectionType = Direction.FORWARD | Direction.BACKWARD;

export enum HistoryAction {
  PUSH = "PUSH",
  POP = "POP",
  REPLACE = "REPLACE",
}

export interface HistoryState {
  /** pathname + search */
  path: string;
  data?: unknown;
  action?: HistoryAction;
  /** 스택 엔트리 고유 key */
  key?: string;
  /** 스택 내 위치 (0 = root) */
  index?: number;
}

export type HistoryListener = (state: HistoryState) => void;
