import React, { useLayoutEffect, useRef } from "react";
import type { StackPageLayout } from "../page-layout";
import {
  getStackPageAttributes,
  hasPendingAnimation,
  isOwnPageAnimation,
  type StackPageAttributeOptions,
} from "../styles";

interface StackPageProps extends StackPageAttributeOptions {
  page: Pick<StackPageLayout, "pageState" | "isTop" | "zIndex">;
  /** 커밋 중 이 페이지에 시작 대기 중인 CSS 애니메이션이 있으면 호출 (Web Animations API 지원 시) */
  onAnimationPending?: () => void;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
  children: React.ReactNode;
}

/** 스택 한 장. top 이 아니면 inert·aria-hidden (스크린리더·포커스 차단) */
export default function StackPage({
  page,
  onAnimationPending,
  onAnimationStart,
  onAnimationEnd,
  children,
  ...attributeOptions
}: StackPageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { pageState, isTop } = page;
  const { direction } = attributeOptions;

  useLayoutEffect(() => {
    // ponytail: React 18/19 의 inert prop 처리가 달라 DOM 속성을 직접 토글
    ref.current?.toggleAttribute("inert", !isTop);
  }, [isTop]);

  useLayoutEffect(() => {
    if (!ref.current || !onAnimationPending) return;
    if (hasPendingAnimation(ref.current)) onAnimationPending();
    // 전환(상태·방향)이 바뀔 때만 확인한다
  }, [pageState, direction]);

  const { className, style, ...attributes } = getStackPageAttributes(
    page,
    attributeOptions
  );

  return (
    <div
      ref={ref}
      {...attributes}
      className={className}
      style={style as React.CSSProperties}
      onAnimationStart={(event) => {
        if (isOwnPageAnimation(event)) onAnimationStart?.();
      }}
      onAnimationEnd={(event) => {
        if (isOwnPageAnimation(event)) onAnimationEnd?.();
      }}
    >
      {children}
    </div>
  );
}
