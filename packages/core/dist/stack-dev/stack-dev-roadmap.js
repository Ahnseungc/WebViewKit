"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackDevRoadmap = StackDevRoadmap;
const jsx_runtime_1 = require("@emotion/react/jsx-runtime");
const react_1 = __importDefault(require("react"));
/**
 * 개발 환경에서 스택 깊이·경로를 눈으로 확인하는 로드맵 오버레이.
 * StackRouterProvider `enableDevTools` 와 함께 사용합니다.
 */
function StackDevRoadmap({ pages, currentPath, visible = true, }) {
    if (!visible || pages.length === 0)
        return null;
    const depth = pages.length;
    return ((0, jsx_runtime_1.jsxs)("div", { role: "status", "aria-live": "polite", "aria-label": `WebViewKit stack depth ${depth}`, style: {
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
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
            fontSize: 11,
            lineHeight: 1.45,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            pointerEvents: "none",
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: 8 }, children: [(0, jsx_runtime_1.jsx)("span", { style: { color: "#00e8b8", fontWeight: 700 }, children: "WebViewKit" }), (0, jsx_runtime_1.jsxs)("span", { style: { color: "#94a3b8" }, children: ["stack \u00D7 ", depth] })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 0,
                    marginTop: 10,
                    padding: "4px 0",
                }, children: pages.map((page, index) => {
                    const isCurrent = page.path === currentPath;
                    const isLast = index === pages.length - 1;
                    return ((0, jsx_runtime_1.jsxs)(react_1.default.Fragment, { children: [index > 0 && ((0, jsx_runtime_1.jsx)("span", { style: {
                                    width: 14,
                                    height: 2,
                                    background: isLast
                                        ? "linear-gradient(90deg,#334155,#00e8b8)"
                                        : "#334155",
                                    flexShrink: 0,
                                } })), (0, jsx_runtime_1.jsx)("span", { title: page.path, style: {
                                    width: isCurrent ? 12 : 8,
                                    height: isCurrent ? 12 : 8,
                                    borderRadius: "50%",
                                    flexShrink: 0,
                                    background: isCurrent ? "#00e8b8" : "#475569",
                                    boxShadow: isCurrent ? "0 0 10px rgba(0,232,184,0.85)" : "none",
                                    transition: "all 0.2s ease",
                                } })] }, `${page.path}-${index}`));
                }) }), (0, jsx_runtime_1.jsx)("ol", { style: { margin: "8px 0 0", paddingLeft: 18, color: "#cbd5e1" }, children: pages.map((page, index) => {
                    const isCurrent = index === pages.length - 1;
                    return ((0, jsx_runtime_1.jsxs)("li", { style: {
                            fontWeight: isCurrent ? 600 : 400,
                            color: isCurrent ? "#00e8b8" : "#94a3b8",
                        }, children: [page.path, isCurrent ? " ← top" : ""] }, `${page.path}-${index}`));
                }) })] }));
}
