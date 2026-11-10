import type React from "react";
import type { StackBridgeSyncOptions } from "./stack-router/bridge-sync";
import type {
  ActivityRoute,
  PopStateTransition,
  RestoreStackPolicy,
  StackTransitionType,
} from "./type";

export interface Activity extends ActivityRoute {
  element: React.ReactNode;
}

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
  /**
   * 브라우저 popstate(WebViewKit 의 back·pop·popTo 가 아닌 history 이동: 브라우저·하드웨어 back/forward,
   * iOS WKWebView 엣지 스와이프)로 생기는 전환 (기본 "animate").
   * "none" 이면 애니메이션 없이 즉시 반영한다. 네이티브가 이미 스냅샷을 슬라이드한 경우 두 번 슬라이드되지 않게
   */
  popStateTransition?: PopStateTransition;
  /** 새로고침·딥링크 진입 시 스택 복원 정책 (기본 "with-root") */
  restoreStack?: RestoreStackPolicy;
  /** keepAlive 페이지 최대 보관 수 (기본 KEEP_ALIVE_LIMIT, 0 이면 보관 안 함) */
  keepAliveLimit?: number;
  /** 스택 top 에서부터 children 을 마운트할 최대 페이지 수 (기본 제한 없음, 1 미만은 1) */
  maxMountedPages?: number;
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
