export interface StackEntry {
  key: string;
  /** 실제 URL (pathname + search) */
  path: string;
  /** 매칭된 Activity path 패턴 */
  pattern: string;
  params: Record<string, string>;
  query: Record<string, string>;
  data?: unknown;
}

export type StackTransition =
  | { type: "push"; enterKey: string; exitKey: string }
  | { type: "pop"; enterKey: string; exitKeys: string[] }
  | null;

export interface StackState {
  entries: StackEntry[];
  /** pop 애니메이션 중인 엔트리. END_TRANSITION 에서 제거 */
  leaving: StackEntry[];
  transition: StackTransition;
}

export type StackAction =
  | { type: "PUSH"; entry: StackEntry; animate: boolean }
  | { type: "REPLACE"; entry: StackEntry }
  | { type: "POP_TO"; index: number; animate: boolean }
  | { type: "RESET"; entry: StackEntry }
  | { type: "RESTORE"; entries: StackEntry[] }
  | { type: "END_TRANSITION" };

const topOf = (entries: StackEntry[]) => entries[entries.length - 1];

export function createStackState(entry: StackEntry): StackState {
  return { entries: [entry], leaving: [], transition: null };
}

export function stackReducer(
  state: StackState,
  action: StackAction
): StackState {
  switch (action.type) {
    case "PUSH": {
      const previousTop = topOf(state.entries);
      return {
        entries: [...state.entries, action.entry],
        leaving: [],
        transition: action.animate
          ? {
              type: "push",
              enterKey: action.entry.key,
              exitKey: previousTop.key,
            }
          : null,
      };
    }
    case "REPLACE":
      return {
        ...state,
        entries: [...state.entries.slice(0, -1), action.entry],
      };
    case "POP_TO": {
      const index = Math.max(0, action.index);
      if (index >= state.entries.length - 1) return state;
      const entries = state.entries.slice(0, index + 1);
      const leaving = state.entries.slice(index + 1);
      if (!action.animate) {
        return { entries, leaving: [], transition: null };
      }
      return {
        entries,
        leaving,
        transition: {
          type: "pop",
          enterKey: topOf(entries).key,
          exitKeys: leaving.map((entry) => entry.key),
        },
      };
    }
    case "RESET":
      return createStackState(action.entry);
    case "RESTORE":
      return { entries: action.entries, leaving: [], transition: null };
    case "END_TRANSITION":
      if (!state.transition && state.leaving.length === 0) return state;
      return { ...state, leaving: [], transition: null };
    default:
      return state;
  }
}

export type PageState = "enter" | "exit" | "idle" | "covered";

/** 렌더 순서(아래 → 위)와 각 페이지의 data-state */
export function getRenderedPages(
  state: StackState
): { entry: StackEntry; pageState: PageState; isTop: boolean }[] {
  const { entries, leaving, transition } = state;
  const top = topOf(entries);
  return [...entries, ...leaving].map((entry) => {
    const isTop = entry.key === top.key;
    let pageState: PageState = isTop ? "idle" : "covered";
    if (transition?.type === "push") {
      if (entry.key === transition.enterKey) pageState = "enter";
      if (entry.key === transition.exitKey) pageState = "exit";
    }
    if (transition?.type === "pop") {
      if (entry.key === transition.enterKey) pageState = "enter";
      if (transition.exitKeys.includes(entry.key)) pageState = "exit";
    }
    return { entry, pageState, isTop };
  });
}
