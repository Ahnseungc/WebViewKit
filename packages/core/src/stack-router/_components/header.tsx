import React, { useContext } from "react";
import { ActivityContext } from "../activity-context";
import { useStackRouter } from "../stack-router-provider";
import { useStackStyles } from "../use-stack-styles";
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
  useStackStyles();
  const activity = useContext(ActivityContext);
  const { currentPath, canGoBack } = useStackRouter();
  const path = activity?.path ?? currentPath;
  const showBack = activity ? activity.index > 0 : canGoBack;

  return (
    <header className="wvk-header">
      {showBack && <BackRouter />}
      <h1 className="wvk-header-title">{title ?? path}</h1>
    </header>
  );
};

export default Header;
