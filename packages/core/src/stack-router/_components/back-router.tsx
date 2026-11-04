import styled from "@emotion/styled";
import React from "react";
import { useStackRouter } from "../stack-router-provider";

interface BackRouterProps {
  /** 스크린리더 라벨 */
  label?: string;
}

const BackRouter = ({ label = "뒤로 가기" }: BackRouterProps) => {
  const { back } = useStackRouter();
  return (
    <BackButton type="button" aria-label={label} onClick={() => back()}>
      <BackIcon />
    </BackButton>
  );
};

export default BackRouter;

/**
 styles
 */

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  color: var(--wvk-back-color, #000000);

  &:hover {
    color: var(--wvk-back-hover-color, #666666);
  }

  &:active {
    color: var(--wvk-back-active-color, #999999);
  }
`;

const BackIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 20L4 12L12 4"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
