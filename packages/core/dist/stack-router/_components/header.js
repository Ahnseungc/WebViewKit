"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("@emotion/react/jsx-runtime");
const react_1 = require("react");
const styled_1 = __importDefault(require("@emotion/styled"));
const back_router_1 = __importDefault(require("./back-router"));
const stack_router_provider_1 = require("../stack-router-provider");
const constants_1 = require("../../constants");
const Header = () => {
    const { currentPath, visiblePages } = (0, stack_router_provider_1.useStackRouter)();
    const [displayPath, setDisplayPath] = (0, react_1.useState)(currentPath);
    const [isVisible, setIsVisible] = (0, react_1.useState)(visiblePages.length > 1);
    (0, react_1.useEffect)(() => {
        const timer = setTimeout(() => {
            setDisplayPath(currentPath);
            setIsVisible(visiblePages.length > 1);
        }, constants_1.STACK_TRANSITION_MS);
        return () => clearTimeout(timer);
    }, [currentPath, visiblePages]);
    return ((0, jsx_runtime_1.jsxs)(StyledHeader, { children: [isVisible && (0, jsx_runtime_1.jsx)(back_router_1.default, {}), (0, jsx_runtime_1.jsx)(StyledTitle, { children: displayPath })] }));
};
/**
 styles
 */
const StyledHeader = styled_1.default.header `
  width: 100%;
  height: 64px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 1rem;
`;
const StyledTitle = styled_1.default.h1 `
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
`;
exports.default = Header;
