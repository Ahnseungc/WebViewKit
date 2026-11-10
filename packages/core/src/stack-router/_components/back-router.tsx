import React from "react";
import { useStackRouter } from "../stack-router-provider";
import { useStackStyles } from "../use-stack-styles";

interface BackRouterProps {
  /** 스크린리더 라벨 */
  label?: string;
}

const BackRouter = ({ label = "뒤로 가기" }: BackRouterProps) => {
  useStackStyles();
  const { back } = useStackRouter();
  return (
    <button
      type="button"
      className="wvk-back"
      aria-label={label}
      onClick={() => back()}
    >
      <BackIcon />
    </button>
  );
};

export default BackRouter;

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
