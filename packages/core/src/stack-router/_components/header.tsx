import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import React from "react";
import type { StackTransitionType } from "../../type";
import { useStackRouter } from "../stack-router-provider";
import BackRouter from "./back-router";
import { IOS_EASING } from "./stack-page";

/** 전환 중인 헤더가 그려야 할 이전 화면 정보 */
export interface HeaderMotion {
  direction: "push" | "pop";
  transitionType: StackTransitionType;
  duration: number;
  /** 사라지는 페이지의 key·path */
  exitKey: string;
  exitPath: string;
  /** 전환 전 back 버튼이 보였는지 */
  backWasVisible: boolean;
}

interface StackHeaderProps {
  /** 기본: 현재 path. 지정하면 제목은 전환하지 않는다 */
  title?: React.ReactNode;
  /** @internal StackRouterProvider 가 전환 중에만 넘긴다 */
  motion?: HeaderMotion | null;
}

/**
 * iOS 내비게이션 바처럼 제목이 페이지 방향으로 밀리며 크로스페이드한다.
 * 제목 이동 폭은 페이지 이동(100%)보다 작게 둔다.
 */
const TITLE_OFFSET = "40%";

const slideTitle = (from: string, to: string, fromOpacity: 0 | 1) => keyframes`
  from { transform: translate3d(${from}, 0, 0); opacity: ${fromOpacity}; }
  to { transform: translate3d(${to}, 0, 0); opacity: ${1 - fromOpacity}; }
`;
const titleInFromRight = slideTitle(TITLE_OFFSET, "0", 0);
const titleInFromLeft = slideTitle(`-${TITLE_OFFSET}`, "0", 0);
const titleOutToLeft = slideTitle("0", `-${TITLE_OFFSET}`, 1);
const titleOutToRight = slideTitle("0", TITLE_OFFSET, 1);
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;
const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

type Keyframes = ReturnType<typeof keyframes>;

function titleKeyframes(motion: HeaderMotion, role: "enter" | "exit") {
  if (motion.transitionType === "fade") {
    return role === "enter" ? fadeIn : fadeOut;
  }
  if (role === "enter") {
    return motion.direction === "push" ? titleInFromRight : titleInFromLeft;
  }
  return motion.direction === "push" ? titleOutToLeft : titleOutToRight;
}

const animate = (motion: HeaderMotion, animation: Keyframes) => css`
  animation: ${animation} ${motion.duration}ms ${IOS_EASING} forwards;
`;

const Header = ({ title, motion }: StackHeaderProps) => {
  const { currentPath, currentState, canGoBack } = useStackRouter();
  // 루트로 돌아갈 때 back 버튼이 페이드아웃할 동안 남겨 둔다
  const showBack = canGoBack || Boolean(motion?.backWasVisible);
  const backChanged = motion && motion.backWasVisible !== canGoBack;
  const titleMotion = title === undefined ? motion : null;

  return (
    <StyledHeader>
      {showBack && (
        <BackSlot
          data-testid="wvk-header-back"
          css={
            backChanged
              ? animate(motion, canGoBack ? fadeIn : fadeOut)
              : undefined
          }
        >
          <BackRouter />
        </BackSlot>
      )}
      <TitleSlot>
        <StyledTitle
          key={currentState.key}
          withBack={canGoBack}
          css={
            titleMotion
              ? animate(titleMotion, titleKeyframes(titleMotion, "enter"))
              : undefined
          }
        >
          {title ?? currentPath}
        </StyledTitle>
        {titleMotion && (
          <StyledTitle
            key={titleMotion.exitKey}
            withBack={titleMotion.backWasVisible}
            aria-hidden="true"
            data-testid="wvk-header-exit-title"
            css={[
              exitLayer,
              animate(titleMotion, titleKeyframes(titleMotion, "exit")),
            ]}
          >
            {titleMotion.exitPath}
          </StyledTitle>
        )}
      </TitleSlot>
    </StyledHeader>
  );
};

/**
 styles
 */

/** BackRouter 버튼 폭. back 버튼이 있는 페이지의 제목은 이만큼 들여 쓴다 */
const BACK_SLOT_WIDTH = "40px";
const HEADER_PADDING_X = "1rem";

const StyledHeader = styled.header`
  position: relative;
  width: 100%;
  height: 64px;
  flex-shrink: 0;
  box-sizing: border-box;
  background-color: var(--wvk-header-bg, #ffffff);
  border-bottom: 1px solid var(--wvk-header-border, #e5e7eb);
  display: flex;
  align-items: center;
  padding: 0 ${HEADER_PADDING_X};
`;

/** 흐름 밖에 두어 back 버튼이 생기거나 사라져도 제목이 밀리지 않게 한다 */
const BackSlot = styled.div`
  position: absolute;
  top: 50%;
  left: ${HEADER_PADDING_X};
  z-index: 1;
  display: flex;
  transform: translateY(-50%);
`;

const TitleSlot = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
`;

const StyledTitle = styled.h1<{ withBack: boolean }>`
  margin: 0;
  box-sizing: border-box;
  padding-left: ${({ withBack }) => (withBack ? BACK_SLOT_WIDTH : "0")};
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--wvk-header-color, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const exitLayer = css`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  pointer-events: none;
`;

export default Header;
