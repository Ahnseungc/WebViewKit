import type { Component } from "svelte";
import type {
  ActivityRoute,
  PopStateTransition,
  RestoreStackPolicy,
  StackBridgeSyncOptions,
  StackTransitionType,
} from "../core.js";

export interface SvelteActivity extends ActivityRoute {
  // 페이지 컴포넌트는 props 없이 마운트된다 (경로 정보는 useActivity·useParams 로)

  component: Component<any>;
}

export interface StackRouterProps {
  initialActivity: SvelteActivity;
  activities?: SvelteActivity[];
  maxWidth?: string;
  /** true면 각 페이지 상단에 `StackHeader` 렌더 (페이지와 함께 전환) */
  isShowHeader?: boolean;
  transition?: StackTransitionType;
  /** 전환 시간 ms (기본 STACK_TRANSITION_MS) */
  duration?: number;
  popStateTransition?: PopStateTransition;
  restoreStack?: RestoreStackPolicy;
  /** keepAlive 페이지 최대 보관 수 (마운트 시 1회만 읽는다) */
  keepAliveLimit?: number;
  /** 스택 top 에서부터 내용을 마운트할 최대 페이지 수 (기본 제한 없음, 1 미만은 1) */
  maxMountedPages?: number;
  /** env(safe-area-inset-*) padding 적용 */
  safeArea?: boolean;
  /** 네이티브 브릿지 연동 */
  bridge?: boolean | StackBridgeSyncOptions;
  /** 루트에서 back 했을 때 (앱 종료·WebView 닫기 위임) */
  onBackAtRoot?: () => void;
  /** 등록되지 않은 경로로 이동하려 할 때 */
  onNotFound?: (path: string) => void;
}
