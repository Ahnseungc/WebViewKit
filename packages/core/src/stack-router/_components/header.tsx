import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import BackRouter from "./back-router";
import { useStackRouter } from "../stack-router-provider";

const Header = () => {
  const { currentPath, visiblePages } = useStackRouter();
  const [displayPath, setDisplayPath] = useState(currentPath);
  const [isVisible, setIsVisible] = useState(visiblePages.length > 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayPath(currentPath);
      setIsVisible(visiblePages.length > 1);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPath, visiblePages]);

  return (
    <StyledHeader>
      {isVisible && <BackRouter />}
      <StyledTitle>{displayPath}</StyledTitle>
    </StyledHeader>
  );
};

/**
 styles
 */

const StyledHeader = styled.header`
  width: 100%;
  height: 64px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 1rem;
`;

const StyledTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
`;

export default Header;
