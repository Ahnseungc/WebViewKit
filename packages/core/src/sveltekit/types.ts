import type { Page } from "@sveltejs/kit";
import type { Snippet } from "svelte";
import type {
  PopStateTransition,
  StackBridgeSyncOptions,
  StackTransitionType,
} from "../core.js";

/** 페이지가 스택에 들어올 때(top 인 동안은 최신)의 `$app/state` page 값 */
export type StackPageSnapshot = Pick<
  Page,
  "url" | "params" | "route" | "data" | "form" | "status" | "error" | "state"
>;

export interface StackLayoutProps {
  /**
   * 스택에 쌓을 `+page.svelte` 들. `+layout.svelte` 에서
   * `import.meta.glob("./**\/+page.svelte", { eager: true })` 를 그대로 넘긴다
   * (루트가 아닌 레이아웃이면 `/src/routes/**\/+page.svelte` 절대 경로로).
   * 여기 없는 route·에러 화면은 지금 페이지일 때만 `children` 으로 그린다
   */
  pages: Record<string, unknown>;
  /** `+layout.svelte` 의 children. 등록 안 된 route·에러 화면 대체용 */
  children?: Snippet;
  transition?: StackTransitionType;
  /** 전환 시간 ms (기본 STACK_TRANSITION_MS) */
  duration?: number;
  popStateTransition?: PopStateTransition;
  maxWidth?: string;
  /** 스택 top 에서부터 내용을 마운트할 최대 페이지 수 */
  maxMountedPages?: number;
  /** env(safe-area-inset-*) padding 적용 */
  safeArea?: boolean;
  /** true 를 돌려주는 path(pathname+search) 는 스택에서 빠져도 보관하고, 다시 오면 그 인스턴스(입력·스크롤)를 되살린다 */
  keepAlive?: (path: string) => boolean;
  /** keepAlive 페이지 최대 보관 수 (마운트 시 1회만 읽는다) */
  keepAliveLimit?: number;
  /** 루트에서 back 했을 때 (useStack().back, native back.request) */
  onBackAtRoot?: () => void;
  /** native 앱이 스택을 움직이고 하드웨어 back 에 응답하게 한다 */
  bridge?: boolean | StackBridgeSyncOptions;
}
