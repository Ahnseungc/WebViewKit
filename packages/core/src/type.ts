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
