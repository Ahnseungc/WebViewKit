import styled from "@emotion/styled";
import React from "react";
import { useStackRouter } from "../stack-router-provider";
import BackRouter from "./back-router";

interface StackHeaderProps {
  /** 기본: 현재 path */
  title?: React.ReactNode;
}

const Header = ({ title }: StackHeaderProps) => {
  const { currentPath, canGoBack } = useStackRouter();

  return (
    <StyledHeader>
      {canGoBack && <BackRouter />}
      <StyledTitle>{title ?? currentPath}</StyledTitle>
    </StyledHeader>
  );
};

/**
 styles
 */

const StyledHeader = styled.header`
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
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--wvk-header-color, #111827);
`;

export default Header;
