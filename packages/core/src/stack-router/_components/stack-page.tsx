import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import React, { useLayoutEffect, useRef } from "react";
import type { StackTransitionType } from "../../type";
import type { PageState } from "../stack-reducer";

type Direction = "push" | "pop";

/**
 * iOS UINavigationController 전환을 따른다.
 * - 위 페이지: 화면 오른쪽 끝 ↔ 0, 왼쪽 가장자리 그림자
 * - 아래 페이지: 0 ↔ -30% 패럴랙스, 투명도 대신 검은 dim 레이어
 * - 곡선: 빠르게 출발해 천천히 멈추는 iOS 기본 감속 곡선
 */
const IOS_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
const FADE_EASING = "ease";
const PARALLAX_OFFSET = "-30%";
const EDGE_SHADOW = "var(--wvk-edge-shadow, -6px 0 24px rgba(0, 0, 0, 0.12))";

// 그림자는 dim 과 함께 나타나고 사라진다. 고정이면 back 끝까지 진하게 남는다
const coverIn = keyframes`
  from { transform: translate3d(100%, 0, 0); box-shadow: none; }
  to { transform: translate3d(0, 0, 0); box-shadow: ${EDGE_SHADOW}; }
`;
const coverOut = keyframes`
  from { transform: translate3d(0, 0, 0); box-shadow: ${EDGE_SHADOW}; }
  to { transform: translate3d(100%, 0, 0); box-shadow: none; }
`;
const parallaxOut = keyframes`
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(${PARALLAX_OFFSET}, 0, 0); }
`;
const parallaxIn = keyframes`
  from { transform: translate3d(${PARALLAX_OFFSET}, 0, 0); }
  to { transform: translate3d(0, 0, 0); }
`;
const dimIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;
const dimOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;
const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

type Layer = "upper" | "lower";

/** push 의 enter·pop 의 exit 는 위에서 움직이는 페이지, 나머지는 아래 페이지 */
const layerOf = (direction: Direction, pageState: "enter" | "exit"): Layer =>
  (direction === "push") === (pageState === "enter") ? "upper" : "lower";

function slideStyles(
  direction: Direction,
  pageState: "enter" | "exit",
  duration: number
) {
  const timing = `${duration}ms ${IOS_EASING} forwards`;
  if (layerOf(direction, pageState) === "upper") {
    return css`
      animation: ${direction === "push" ? coverIn : coverOut} ${timing};
    `;
  }
  return css`
    animation: ${direction === "push" ? parallaxOut : parallaxIn} ${timing};
    &::after {
      content: "";
      /* transform 중인 페이지 기준 fixed = 스크롤과 무관하게 페이지 전체를 덮음 */
      position: fixed;
      inset: 0;
      pointer-events: none;
      background: var(--wvk-dim-color, rgba(0, 0, 0, 0.12));
      animation: ${direction === "push" ? dimIn : dimOut} ${timing};
    }
  `;
}

interface PageWrapperProps {
  pageState: PageState;
  direction: Direction;
  transitionType: StackTransitionType;
  duration: number;
  zIndex: number;
}

const PageWrapper = styled.div<PageWrapperProps>`
  position: absolute;
  inset: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--wvk-page-bg, #ffffff);
  z-index: ${({ zIndex }) => zIndex};
  visibility: ${({ pageState }) =>
    pageState === "covered" || pageState === "cached" ? "hidden" : "visible"};
  ${({ pageState, direction, transitionType, duration }) => {
    if (pageState !== "enter" && pageState !== "exit") return "";
    if (transitionType === "none" || duration === 0) return "";
    if (transitionType === "fade") {
      return css`
        will-change: opacity;
        animation: ${pageState === "enter" ? fadeIn : fadeOut} ${duration}ms
          ${FADE_EASING} forwards;
      `;
    }
    return css`
      will-change: transform;
      ${slideStyles(direction, pageState, duration)}
    `;
  }}
`;

interface StackPageProps extends PageWrapperProps {
  isTop: boolean;
  onAnimationEnd?: () => void;
  children: React.ReactNode;
}

/** 스택 한 장. top 이 아니면 inert·aria-hidden (스크린리더·포커스 차단) */
export default function StackPage({
  isTop,
  onAnimationEnd,
  children,
  ...wrapperProps
}: StackPageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // ponytail: React 18/19 의 inert prop 처리가 달라 DOM 속성을 직접 토글
    ref.current?.toggleAttribute("inert", !isTop);
  }, [isTop]);

  return (
    <PageWrapper
      ref={ref}
      {...wrapperProps}
      data-state={wrapperProps.pageState}
      aria-hidden={isTop ? undefined : true}
      onAnimationEnd={(event) => {
        // dim(::after) 애니메이션 종료는 무시하고 페이지 자체 전환만 본다
        if (event.target === event.currentTarget && !event.pseudoElement) {
          onAnimationEnd?.();
        }
      }}
    >
      {children}
    </PageWrapper>
  );
}
