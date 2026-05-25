"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("@emotion/react/jsx-runtime");
const styled_1 = __importDefault(require("@emotion/styled"));
const stack_router_provider_1 = require("../stack-router-provider");
const BackRouter = () => {
    const { back } = (0, stack_router_provider_1.useStackRouter)();
    return ((0, jsx_runtime_1.jsx)(BackButton, { onClick: back, children: (0, jsx_runtime_1.jsx)(BackIcon, {}) }));
};
exports.default = BackRouter;
/**
 styles
 */
const BackButton = styled_1.default.button `
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
  color: #000000;

  &:hover {
    color: #666666;
  }

  &:active {
    color: #999999;
  }
`;
const BackIcon = () => ((0, jsx_runtime_1.jsx)("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: (0, jsx_runtime_1.jsx)("path", { d: "M12 20L4 12L12 4", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }) }));
