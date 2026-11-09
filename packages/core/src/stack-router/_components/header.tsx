import styled from "@emotion/styled";
import React, { useContext } from "react";
import { ActivityContext } from "../activity-context";
import { useStackRouter } from "../stack-router-provider";
import BackRouter from "./back-router";

interface StackHeaderProps {
  /** 기본: 이 헤더가 속한 페이지의 path */
  title?: React.ReactNode;
}

/**
 * 페이지 안에 있으면 그 페이지 기준(제목·back 버튼)으로 그려 페이지와 함께 전환된다.
 * 페이지 밖이면 현재 top 기준.
 */
const Header = ({ title }: StackHeaderProps) => {
  const activity = useContext(ActivityContext);
  const { currentPath, canGoBack } = useStackRouter();
  const path = activity?.path ?? currentPath;
  const showBack = activity ? activity.index > 0 : canGoBack;

  return (
    <StyledHeader>
      {showBack && <BackRouter />}
      <StyledTitle>{title ?? path}</StyledTitle>
    </StyledHeader>
  );
};

/**
 styles
 */

const StyledHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 1;
  width: 100%;
  height: 64px;
  flex-shrink: 0;
  box-sizing: border-box;
  background-color: var(--wvk-header-bg, #ffffff);
  border-bottom: 1px solid var(--wvk-header-border, #e5e7eb);
  display: flex;
  align-items: center;
  padding: 0 1rem;
`;

const StyledTitle = styled.h1`
  margin: 0;
  min-width: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--wvk-header-color, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export default Header;
