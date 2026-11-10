import {
  getRenderedPages,
  type PageState,
  type StackEntry,
  type StackState,
} from "./stack-reducer";

const MIN_MOUNTED_PAGES = 1;
/** 보관(cached) 페이지의 activity index */
const CACHED_ACTIVITY_INDEX = -1;

export interface StackPageLayout {
  entry: StackEntry;
  pageState: PageState;
  isTop: boolean;
  /** 쌓임 순서 (아래 0 → 위) */
  zIndex: number;
  /** 스택 위치. 퇴장 중이면 빠지기 전 위치, 보관 중이면 -1 */
  activityIndex: number;
  /** false 면 페이지 껍데기만 두고 내용은 그리지 않는다 (maxMountedPages) */
  mounted: boolean;
}

export interface PageLayoutOptions {
  /** 스택 top 에서부터 내용을 마운트할 최대 페이지 수 (기본 제한 없음, 1 미만은 1) */
  maxMountedPages?: number;
}

/**
 * 스택 상태 → 그릴 페이지 목록 (DOM 순서). 바인딩은 결과를 `entry.key` 로 키잉해 그대로 그린다.
 * 직전 결과를 기억하므로 바인딩(라우터 인스턴스)마다 하나씩 만든다.
 */
export function createPageLayout() {
  // 직전에 마운트돼 있던 key. 퇴장 페이지를 슬라이드만 하려고 새로 마운트하지 않기 위함
  let mountedKeys = new Set<string>();
  // DOM 이동은 스크롤 위치를 초기화하므로 key 의 최초 렌더 순서로 DOM 순서를 고정한다.
  // 쌓임 순서는 zIndex 로 표현한다.
  let domOrder: string[] = [];

  return (
    state: StackState,
    { maxMountedPages }: PageLayoutOptions = {}
  ): StackPageLayout[] => {
    const pages = getRenderedPages(state);
    const stackIndexByKey = new Map(
      state.entries.map((entry, index) => [entry.key, index])
    );
    const activityIndexOf = (entry: StackEntry) => {
      const stackIndex = stackIndexByKey.get(entry.key);
      if (stackIndex !== undefined) return stackIndex;
      const leavingIndex = state.leaving.findIndex(
        (item) => item.key === entry.key
      );
      return leavingIndex === -1
        ? CACHED_ACTIVITY_INDEX
        : state.entries.length + leavingIndex;
    };
    const mountLimit =
      maxMountedPages === undefined || !Number.isFinite(maxMountedPages)
        ? Infinity
        : Math.max(MIN_MOUNTED_PAGES, maxMountedPages);
    const wasMounted = mountedKeys;
    const shouldMount = ({ entry, pageState }: (typeof pages)[number]) => {
      // cached 페이지와 keepAlive 엔트리는 항상 마운트
      if (pageState === "cached" || entry.keepAlive) return true;
      const stackIndex = stackIndexByKey.get(entry.key);
      // 스택 밖(퇴장 중) 페이지는 이미 마운트돼 있던 경우에만 유지
      if (stackIndex === undefined) return wasMounted.has(entry.key);
      if (pageState === "enter" || pageState === "exit") return true;
      return state.entries.length - stackIndex <= mountLimit;
    };
    mountedKeys = new Set(
      pages.filter(shouldMount).map((page) => page.entry.key)
    );

    const currentKeys = new Set(pages.map((page) => page.entry.key));
    const knownKeys = new Set(domOrder);
    domOrder = [
      ...domOrder.filter((key) => currentKeys.has(key)),
      ...pages
        .map((page) => page.entry.key)
        .filter((key) => !knownKeys.has(key)),
    ];

    return pages
      .map((page, zIndex) => ({
        ...page,
        zIndex,
        activityIndex: activityIndexOf(page.entry),
        mounted: mountedKeys.has(page.entry.key),
      }))
      .sort(
        (a, b) => domOrder.indexOf(a.entry.key) - domOrder.indexOf(b.entry.key)
      );
  };
}
