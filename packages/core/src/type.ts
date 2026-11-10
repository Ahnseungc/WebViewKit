/** 경로 정의. 화면(element·컴포넌트)은 프레임워크 바인딩이 붙인다 */
export interface ActivityRoute {
  /** 정적 경로 또는 동적 세그먼트 패턴 (`/detail/:id`) */
  path: string;
  /** true 면 스택에서 빠져도 인스턴스(state)를 보관했다가 같은 path 로 돌아오면 되살린다 */
  keepAlive?: boolean;
}

export type StackTransitionType = "slide" | "fade" | "none";

export type RestoreStackPolicy = "with-root" | "top-only";

export type PopStateTransition = "animate" | "none";

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

/** 페이지(Activity) 자신의 정보. 바인딩의 useActivity() 가 돌려준다 */
export interface ActivityInfo {
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
