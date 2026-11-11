import type { StackTransitionType } from "../type";
import type { StackPageLayout } from "./page-layout";

/**
 * iOS UINavigationController 전환을 따른다.
 * - 위 페이지: 화면 오른쪽 끝 ↔ 0, 왼쪽 가장자리 그림자
 * - 아래 페이지: 0 ↔ -30% 패럴랙스, 투명도 대신 검은 dim 레이어
 * - 곡선: 빠르게 출발해 천천히 멈추는 iOS 기본 감속 곡선
 */
const IOS_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
const PARALLAX_OFFSET = "-30%";
const EDGE_SHADOW = "var(--wvk-edge-shadow, -6px 0 24px rgba(0, 0, 0, 0.12))";
const SLIDE = `var(--wvk-duration) ${IOS_EASING} forwards`;
const FADE = "var(--wvk-duration) ease forwards";
const PAGE = '.wvk-page[data-transition="slide"]';

/**
 * 스택 레이아웃·전환·헤더 CSS. 바인딩이 `ensureStackStyles()` 로 주입한다.
 * SSR 첫 페인트부터 필요하면 이 문자열을 `<style>` 로 직접 넣는다
 */
export const stackStyles = `
.wvk-root{width:100%;height:100vh;height:100dvh;display:flex;justify-content:center;background:var(--wvk-page-bg,#ffffff);box-sizing:border-box}
.wvk-root[data-safe-area]{padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
.wvk-layout{width:100%;height:100%;display:flex;flex-direction:column;position:relative;overflow:hidden}
.wvk-pages{position:relative;flex:1;width:100%;overflow:hidden}
.wvk-page{position:absolute;inset:0;overflow:auto;-webkit-overflow-scrolling:touch;background:var(--wvk-page-bg,#ffffff)}
.wvk-page[data-state="covered"],.wvk-page[data-state="cached"]{visibility:hidden}
@keyframes wvk-cover-in{from{transform:translate3d(100%,0,0);box-shadow:none}to{transform:translate3d(0,0,0);box-shadow:${EDGE_SHADOW}}}
@keyframes wvk-cover-out{from{transform:translate3d(0,0,0);box-shadow:${EDGE_SHADOW}}to{transform:translate3d(100%,0,0);box-shadow:none}}
@keyframes wvk-parallax-out{from{transform:translate3d(0,0,0)}to{transform:translate3d(${PARALLAX_OFFSET},0,0)}}
@keyframes wvk-parallax-in{from{transform:translate3d(${PARALLAX_OFFSET},0,0)}to{transform:translate3d(0,0,0)}}
@keyframes wvk-fade-in{from{opacity:0}to{opacity:1}}
@keyframes wvk-fade-out{from{opacity:1}to{opacity:0}}
.wvk-page[data-transition="fade"][data-state="enter"]{will-change:opacity;animation:wvk-fade-in ${FADE}}
.wvk-page[data-transition="fade"][data-state="exit"]{will-change:opacity;animation:wvk-fade-out ${FADE}}
${PAGE}[data-direction="push"][data-state="enter"]{will-change:transform;animation:wvk-cover-in ${SLIDE}}
${PAGE}[data-direction="pop"][data-state="exit"]{will-change:transform;animation:wvk-cover-out ${SLIDE}}
${PAGE}[data-direction="push"][data-state="exit"]{will-change:transform;animation:wvk-parallax-out ${SLIDE}}
${PAGE}[data-direction="pop"][data-state="enter"]{will-change:transform;animation:wvk-parallax-in ${SLIDE}}
${PAGE}[data-direction="push"][data-state="exit"]::after,${PAGE}[data-direction="pop"][data-state="enter"]::after{content:"";position:fixed;inset:0;pointer-events:none;background:var(--wvk-dim-color,rgba(0,0,0,0.12))}
${PAGE}[data-direction="push"][data-state="exit"]::after{animation:wvk-fade-in ${SLIDE}}
${PAGE}[data-direction="pop"][data-state="enter"]::after{animation:wvk-fade-out ${SLIDE}}
.wvk-header{position:sticky;top:0;z-index:1;width:100%;height:64px;flex-shrink:0;box-sizing:border-box;background-color:var(--wvk-header-bg,#ffffff);border-bottom:1px solid var(--wvk-header-border,#e5e7eb);display:flex;align-items:center;padding:0 1rem}
.wvk-header-title{margin:0;min-width:0;font-size:1.25rem;font-weight:600;color:var(--wvk-header-color,#111827);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wvk-back{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:none;background:none;cursor:pointer;padding:8px;border-radius:50%;transition:all 0.2s;color:var(--wvk-back-color,#000000)}
.wvk-back:hover{color:var(--wvk-back-hover-color,#666666)}
.wvk-back:active{color:var(--wvk-back-active-color,#999999)}
`;

export const STYLE_ATTRIBUTE = "data-webviewkit";

/** `stackStyles` 를 document 에 한 번만 넣는다 (SSR 에서는 no-op) */
export function ensureStackStyles(): void {
  if (typeof document === "undefined") return;
  // 라우터가 SSR 로 본문에 그린 <style> 도 있으면 다시 넣지 않는다
  if (document.querySelector(`style[${STYLE_ATTRIBUTE}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(STYLE_ATTRIBUTE, "");
  style.textContent = stackStyles;
  document.head.appendChild(style);
}

export interface StackPageAttributeOptions {
  /** 진행 중 전환 방향 (`state.transition?.type ?? "push"`) */
  direction: "push" | "pop";
  transition: StackTransitionType;
  /** 0 이면 애니메이션 없음 */
  duration: number;
}

/**
 * 페이지 요소에 붙일 class·data 속성·style. top 이 아니면 `inert` 도 함께 켠다 (바인딩이 DOM 속성으로).
 * style 은 프레임워크 style 객체에 그대로 넣을 수 있는 형태다
 */
export function getStackPageAttributes(
  page: Pick<StackPageLayout, "pageState" | "isTop" | "zIndex">,
  { direction, transition, duration }: StackPageAttributeOptions
) {
  return {
    className: "wvk-page",
    "data-state": page.pageState,
    "data-direction": direction,
    "data-transition": duration > 0 ? transition : "none",
    "aria-hidden": page.isTop ? undefined : true,
    style: { zIndex: page.zIndex, "--wvk-duration": `${duration}ms` },
  } as const;
}

interface AnimationEventLike {
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  pseudoElement?: string;
}

/** dim(::after)·자식 애니메이션은 무시하고 페이지 자체 전환만 본다 */
export const isOwnPageAnimation = (event: AnimationEventLike) =>
  event.target === event.currentTarget && !event.pseudoElement;

/**
 * 커밋 직후 페이지에 시작 대기 중인 CSS 애니메이션이 있는지 (Web Animations API 미지원이면 false).
 * true 면 `navigator.awaitTransitionStart()` 를 부른다
 */
export function hasPendingAnimation(element: Element): boolean {
  if (typeof element.getAnimations !== "function") return false;
  // subtree 없이 부르면 dim(::after) 은 빠지고 페이지 자체 애니메이션만 온다
  return element.getAnimations().length > 0;
}
