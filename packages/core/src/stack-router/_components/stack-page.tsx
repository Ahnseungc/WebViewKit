import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import React, { useLayoutEffect, useRef } from "react";
import type { StackTransitionType } from "../../type";
import type { PageState } from "../stack-reducer";

type Direction = "push" | "pop";

const slideInRight = keyframes`
  from { transform: translate3d(100%, 0, 0); }
  to { transform: translate3d(0, 0, 0); }
`;
const slideOutLeft = keyframes`
  from { transform: translate3d(0, 0, 0); opacity: 1; }
  to { transform: translate3d(-30%, 0, 0); opacity: 0.6; }
`;
const slideInLeft = keyframes`
  from { transform: translate3d(-30%, 0, 0); opacity: 0.6; }
  to { transform: translate3d(0, 0, 0); opacity: 1; }
`;
const slideOutRight = keyframes`
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(100%, 0, 0); }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;
const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const SLIDE_KEYFRAMES = {
  push: { enter: slideInRight, exit: slideOutLeft },
  pop: { enter: slideInLeft, exit: slideOutRight },
} as const;

const FADE_KEYFRAMES = { enter: fadeIn, exit: fadeOut } as const;

function pickKeyframes(
  transition: StackTransitionType,
  direction: Direction,
  pageState: "enter" | "exit"
) {
  if (transition === "fade") return FADE_KEYFRAMES[pageState];
  return SLIDE_KEYFRAMES[direction][pageState];
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
    pageState === "covered" ? "hidden" : "visible"};
  ${({ pageState, direction, transitionType, duration }) => {
    if (pageState !== "enter" && pageState !== "exit") return "";
    if (transitionType === "none" || duration === 0) return "";
    return css`
      will-change: transform, opacity;
      animation: ${pickKeyframes(transitionType, direction, pageState)}
        ${duration}ms ease-in-out forwards;
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
        if (event.target === event.currentTarget) onAnimationEnd?.();
      }}
    >
      {children}
    </PageWrapper>
  );
}
