export interface StackRouterProviderProps {
  maxWidth?: string;
  isShowHeader?: boolean;
  Activities?: { path: string; element: React.ReactNode }[];
  initialActivity: { path: string; element: React.ReactNode };
}

export interface VisiblePage {
  path: string;
  element: React.ReactNode;
  isEntering?: boolean;
  isExiting?: boolean;
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
  path: string;
  data?: any;
  action?: HistoryAction.PUSH | HistoryAction.POP | HistoryAction.REPLACE;
}

export type HistoryListener = (state: HistoryState) => void;
