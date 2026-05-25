import React from "react";

export interface StackDevRoadmapProps {
  /** 스택에 쌓인 페이지 경로 (아래 → 위 순) */
  pages: { path: string }[];
  currentPath: string;
  /** false면 렌더하지 않음 */
  visible?: boolean;
}

/**
 * 개발 환경에서 스택 깊이·경로를 눈으로 확인하는 로드맵 오버레이.
 * StackRouterProvider `enableDevTools` 와 함께 사용합니다.
 */
export function StackDevRoadmap({
  pages,
  currentPath,
  visible = true,
}: StackDevRoadmapProps) {
  if (!visible || pages.length === 0) return null;

  const depth = pages.length;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`WebViewKit stack depth ${depth}`}
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 2147483646,
        minWidth: 200,
        maxWidth: 320,
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(7, 11, 18, 0.92)",
        border: "1px solid rgba(0, 232, 184, 0.35)",
        color: "#e8eef4",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        fontSize: 11,
        lineHeight: 1.45,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ color: "#00e8b8", fontWeight: 700 }}>WebViewKit</span>
        <span style={{ color: "#94a3b8" }}>stack × {depth}</span>
      </div>

      {/* 점 → 선 로드맵 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginTop: 10,
          padding: "4px 0",
        }}
      >
        {pages.map((page, index) => {
          const isCurrent = page.path === currentPath;
          const isLast = index === pages.length - 1;
          return (
            <React.Fragment key={`${page.path}-${index}`}>
              {index > 0 && (
                <span
                  style={{
                    width: 14,
                    height: 2,
                    background: isLast
                      ? "linear-gradient(90deg,#334155,#00e8b8)"
                      : "#334155",
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                title={page.path}
                style={{
                  width: isCurrent ? 12 : 8,
                  height: isCurrent ? 12 : 8,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: isCurrent ? "#00e8b8" : "#475569",
                  boxShadow: isCurrent ? "0 0 10px rgba(0,232,184,0.85)" : "none",
                  transition: "all 0.2s ease",
                }}
              />
            </React.Fragment>
          );
        })}
      </div>

      <ol style={{ margin: "8px 0 0", paddingLeft: 18, color: "#cbd5e1" }}>
        {pages.map((page, index) => {
          const isCurrent = index === pages.length - 1;
          return (
            <li
              key={`${page.path}-${index}`}
              style={{
                fontWeight: isCurrent ? 600 : 400,
                color: isCurrent ? "#00e8b8" : "#94a3b8",
              }}
            >
              {page.path}
              {isCurrent ? " ← top" : ""}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
