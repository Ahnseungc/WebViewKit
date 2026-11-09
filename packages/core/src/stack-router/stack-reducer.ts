export interface StackEntry {
  key: string;
  /** 실제 URL (pathname + search) */
  path: string;
  /** 매칭된 Activity path 패턴 */
  pattern: string;
  params: Record<string, string>;
  query: Record<string, string>;
  data?: unknown;
  /** true 면 스택에서 빠져도 보관 목록(cached)에 남긴다 */
  keepAlive?: boolean;
  /** 기존 인스턴스를 새 data 로 재사용(REVIVE·RESET_PUSH)할 때마다 1씩 오른다. 없으면 0 */
  revision?: number;
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
  /** 스택에서 빠졌지만 살려 둔 keepAlive 엔트리 (오래된 → 최근) */
  cached: StackEntry[];
  /** 스택 안 keepAlive 엔트리를 포함한 최대 보관 수. 0 이면 보관 안 함 */
  cacheLimit: number;
}

export type StackAction =
  | { type: "PUSH"; entry: StackEntry; animate: boolean }
  | { type: "REPLACE"; entry: StackEntry }
  | { type: "POP_TO"; index: number; animate: boolean }
  | { type: "RESET"; entry: StackEntry }
  | { type: "RESET_PUSH"; entry: StackEntry; animate: boolean }
  | { type: "RESTORE"; entries: StackEntry[] }
  | {
      type: "REVIVE";
      entry: StackEntry;
      direction: "push" | "pop";
      /** 되살린 뒤 entry 의 스택 위치 */
      index: number;
      animate: boolean;
    }
  | { type: "END_TRANSITION" };

const topOf = (entries: StackEntry[]) => entries[entries.length - 1];

/** 기존 인스턴스를 재사용한다는 표시 (useOnRevive 트리거) */
const bumpRevision = (entry: StackEntry): StackEntry => ({
  ...entry,
  revision: (entry.revision ?? 0) + 1,
});

export function createStackState(
  entry: StackEntry,
  cacheLimit = 0
): StackState {
  return {
    entries: [entry],
    leaving: [],
    transition: null,
    cached: [],
    cacheLimit,
  };
}

/** 스택에서 빠진 keepAlive 엔트리를 보관 목록 뒤에 붙인 새 목록 */
function cacheEntries(state: StackState, removed: StackEntry[]): StackEntry[] {
  const { entries, cached, cacheLimit } = state;
  const incoming = removed.filter((entry) => entry.keepAlive);
  if (cacheLimit <= 0 || incoming.length === 0) return cached;
  const incomingPaths = new Set(incoming.map((entry) => entry.path));
  const merged = [
    ...cached.filter((entry) => !incomingPaths.has(entry.path)),
    ...incoming,
  ];
  const capacity = cacheLimit - entries.filter((e) => e.keepAlive).length;
  return capacity > 0 ? merged.slice(-capacity) : [];
}

/** 퇴장 중이던 엔트리 중 결과 스택에 없는 것만 보관한다 (END_TRANSITION 과 공용) */
function flushLeaving(state: StackState, nextEntries: StackEntry[]) {
  const alive = new Set(nextEntries.map((entry) => entry.key));
  const removed = state.leaving.filter((entry) => !alive.has(entry.key));
  return cacheEntries({ ...state, entries: nextEntries }, removed);
}

/** 보관 목록에서 되살린 엔트리를 스택에 올린다 */
function revive(
  state: StackState,
  action: Extract<StackAction, { type: "REVIVE" }>
): StackState {
  const { direction, index, animate } = action;
  const entry = bumpRevision(action.entry);
  const previousTop = topOf(state.entries);
  const entries = [...state.entries.slice(0, index), entry];
  const removed = state.entries.slice(index);
  const cached = state.cached.filter((item) => item.key !== entry.key);
  const base = { ...state, entries, cached };
  if (!animate || (direction === "pop" && removed.length === 0)) {
    return {
      ...base,
      cached: cacheEntries(base, removed),
      leaving: [],
      transition: null,
    };
  }
  if (direction === "push") {
    // 이전 top 이 스택에서 빠졌으면 퇴장 애니메이션 동안만 leaving 에 둔다
    const stillInStack = !removed.includes(previousTop);
    return {
      ...base,
      cached: cacheEntries(
        base,
        removed.filter((item) => item !== previousTop)
      ),
      leaving: stillInStack ? [] : [previousTop],
      transition: {
        type: "push",
        enterKey: entry.key,
        exitKey: previousTop.key,
      },
    };
  }
  return {
    ...base,
    leaving: removed,
    transition: {
      type: "pop",
      enterKey: entry.key,
      exitKeys: removed.map((item) => item.key),
    },
  };
}

/** path 가 같은 되살릴 엔트리를 찾는다. includeRemovable 이면 지워질 스택 쪽(keepAlive)을 먼저 본다 */
export function findRevivable(
  state: StackState,
  path: string,
  opts: { includeRemovable?: boolean } = {}
): StackEntry | undefined {
  const matches = (entry: StackEntry) => entry.path === path;
  const fromStack = opts.includeRemovable
    ? [...state.entries.slice(1)]
        .reverse()
        .find((entry) => entry.keepAlive && matches(entry))
    : undefined;
  return (
    fromStack ?? [...state.cached].reverse().find((entry) => matches(entry))
  );
}

const OVERWRITES_LEAVING = new Set<StackAction["type"]>([
  "PUSH",
  "POP_TO",
  "RESET",
  "RESET_PUSH",
  "RESTORE",
  "REVIVE",
]);

export function stackReducer(
  state: StackState,
  action: StackAction
): StackState {
  if (!OVERWRITES_LEAVING.has(action.type) || state.leaving.length === 0) {
    return reduce(state, action);
  }
  // 전환 중 다른 액션이 leaving 을 덮어쓰기 전에 퇴장 중인 keepAlive 를 보관한다
  const settled = { ...state, leaving: [] };
  const next = reduce(settled, action);
  if (next === settled) return state;
  return reduce(
    { ...settled, cached: flushLeaving(state, next.entries) },
    action
  );
}

function reduce(state: StackState, action: StackAction): StackState {
  switch (action.type) {
    case "PUSH": {
      const previousTop = topOf(state.entries);
      return {
        ...state,
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
    case "REPLACE": {
      const entries = [...state.entries.slice(0, -1), action.entry];
      return {
        ...state,
        entries,
        cached: cacheEntries({ ...state, entries }, [topOf(state.entries)]),
      };
    }
    case "POP_TO": {
      const index = Math.max(0, action.index);
      if (index >= state.entries.length - 1) return state;
      const entries = state.entries.slice(0, index + 1);
      const leaving = state.entries.slice(index + 1);
      if (!action.animate) {
        return {
          ...state,
          entries,
          leaving: [],
          transition: null,
          cached: cacheEntries({ ...state, entries }, leaving),
        };
      }
      return {
        ...state,
        entries,
        leaving,
        transition: {
          type: "pop",
          enterKey: topOf(entries).key,
          exitKeys: leaving.map((entry) => entry.key),
        },
      };
    }
    case "RESET": {
      const next = createStackState(action.entry, state.cacheLimit);
      return {
        ...next,
        cached: cacheEntries(
          { ...state, entries: next.entries },
          state.entries
        ),
      };
    }
    case "REVIVE":
      return revive(state, action);
    case "RESET_PUSH": {
      // 루트만 남기고 새 엔트리를 쌓는다. 이전 top 은 퇴장 애니메이션 동안만 남긴다
      const [root] = state.entries;
      const previousTop = topOf(state.entries);
      // 재사용하는 엔트리(같은 key)는 보관하지 않고 원래 있던 곳에서 뺀다
      const reusedKey = action.entry.key;
      const isReused = [...state.entries, ...state.cached].some(
        (entry) => entry.key === reusedKey
      );
      const entries = [
        root,
        isReused ? bumpRevision(action.entry) : action.entry,
      ];
      const sameTop = previousTop.key === reusedKey;
      // animate 면 이전 top 은 END_TRANSITION 에서 보관하고, 나머지는 지금 보관한다
      const dropped = (
        action.animate ? state.entries.slice(1, -1) : state.entries.slice(1)
      ).filter((entry) => entry.key !== reusedKey);
      const cached = state.cached.filter((entry) => entry.key !== reusedKey);
      const exiting = action.animate && !sameTop;
      return {
        ...state,
        entries,
        cached: cacheEntries({ ...state, entries, cached }, dropped),
        leaving: exiting ? [previousTop] : [],
        transition: exiting
          ? {
              type: "push",
              enterKey: action.entry.key,
              exitKey: previousTop.key,
            }
          : null,
      };
    }
    case "RESTORE":
      return {
        ...state,
        entries: action.entries,
        leaving: [],
        transition: null,
      };
    case "END_TRANSITION": {
      if (!state.transition && state.leaving.length === 0) return state;
      // resetPush 로 루트가 leaving 에 남은 경우처럼 스택에 아직 있는 엔트리는 보관하지 않는다
      return {
        ...state,
        leaving: [],
        transition: null,
        cached: flushLeaving(state, state.entries),
      };
    }
    default:
      return state;
  }
}

export type PageState = "enter" | "exit" | "idle" | "covered" | "cached";

/** 렌더 순서(아래 → 위)와 각 페이지의 data-state */
export function getRenderedPages(
  state: StackState
): { entry: StackEntry; pageState: PageState; isTop: boolean }[] {
  const { entries, leaving, transition, cached } = state;
  const top = topOf(entries);
  // push 중 퇴장하는 엔트리(resetPush)는 새 top 아래에 그린다
  const ordered =
    transition?.type === "push"
      ? [...entries.slice(0, -1), ...leaving, top]
      : [...entries, ...leaving];
  const cachedPages = cached.map((entry) => ({
    entry,
    pageState: "cached" as PageState,
    isTop: false,
  }));
  const stackPages = ordered.map((entry) => {
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
  return [...cachedPages, ...stackPages];
}
