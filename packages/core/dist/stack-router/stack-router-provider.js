"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackRouterProvider = exports.useStackRouter = void 0;
const jsx_runtime_1 = require("@emotion/react/jsx-runtime");
const react_1 = require("react");
const history_1 = require("../history");
const styled_1 = __importDefault(require("@emotion/styled"));
const react_2 = require("@emotion/react");
const constants_1 = require("../constants");
const stack_dev_roadmap_1 = require("../stack-dev/stack-dev-roadmap");
const type_1 = require("../type");
const StackRouterContext = (0, react_1.createContext)(null);
const useStackRouter = () => {
    const context = (0, react_1.useContext)(StackRouterContext);
    if (!context) {
        throw new Error("useStackRouter must be used within a StackRouterProvider");
    }
    return context;
};
exports.useStackRouter = useStackRouter;
const StackRouterProvider = ({ maxWidth = "600px", Activities = [], initialActivity, enableDevTools, }) => {
    const showDevTools = (0, react_1.useMemo)(() => {
        var _a;
        if (enableDevTools !== undefined)
            return enableDevTools;
        return typeof process !== "undefined" && ((_a = process.env) === null || _a === void 0 ? void 0 : _a.NODE_ENV) === "development";
    }, [enableDevTools]);
    const [currentPath, setCurrentPath] = (0, react_1.useState)(history_1.history.getCurrentState().path);
    const [currentState, setCurrentState] = (0, react_1.useState)(history_1.history.getCurrentState());
    const [isTransitioning, setIsTransitioning] = (0, react_1.useState)(false);
    const [direction, setDirection] = (0, react_1.useState)(type_1.Direction.FORWARD);
    const [visiblePages, setVisiblePages] = (0, react_1.useState)([]);
    // initialize visible pages
    (0, react_1.useEffect)(() => {
        setVisiblePages([
            {
                path: initialActivity.path,
                element: initialActivity.element,
                isEntering: true,
            },
        ]);
    }, [initialActivity]);
    // listen to history changes
    (0, react_1.useEffect)(() => {
        const removeListener = history_1.history.addListener((state) => {
            if (!isTransitioning || direction !== type_1.Direction.BACKWARD) {
                setCurrentPath(state === null || state === void 0 ? void 0 : state.path);
                setCurrentState(state);
            }
            setIsTransitioning(true);
            setDirection((state === null || state === void 0 ? void 0 : state.action) === type_1.HistoryAction.POP
                ? type_1.Direction.BACKWARD
                : type_1.Direction.FORWARD);
        });
        return () => {
            removeListener();
        };
    }, [isTransitioning, direction]);
    // handle back
    const handleBack = () => {
        setIsTransitioning(true);
        setDirection(type_1.Direction.BACKWARD);
        setTimeout(() => {
            setVisiblePages((prev) => prev.slice(0, -1));
        }, constants_1.STACK_TRANSITION_MS);
        history_1.history.back();
    };
    // update current path
    (0, react_1.useEffect)(() => {
        if (visiblePages.length > 0) {
            setCurrentPath(visiblePages[visiblePages.length - 1].path);
        }
    }, [visiblePages]);
    // handle push
    const handlePush = (path, data) => {
        setIsTransitioning(true);
        setDirection(type_1.Direction.FORWARD);
        const currentActivity = Activities.find((a) => a.path === path);
        if (currentActivity) {
            setVisiblePages((prev) => {
                const existingIndex = prev.findIndex((a) => a.path === path);
                if (existingIndex !== -1) {
                    const newActivities = [...prev];
                    const [removed] = newActivities.splice(existingIndex, 1);
                    return [...newActivities, { ...removed, isExiting: true }];
                }
                return [
                    ...prev,
                    { path, element: currentActivity.element, isExiting: true },
                ];
            });
            setTimeout(() => {
                setCurrentPath(path);
            }, constants_1.STACK_TRANSITION_MS);
        }
        history_1.history.push(path, data);
    };
    const value = {
        currentPath,
        currentState,
        initialActivity,
        Activities,
        visiblePages,
        push: handlePush,
        replace: history_1.history.replace,
        back: handleBack,
        forward: history_1.history.forward,
    };
    return ((0, jsx_runtime_1.jsxs)(StackRouterContext.Provider, { value: value, children: [(0, jsx_runtime_1.jsx)(LayoutContainer, { children: (0, jsx_runtime_1.jsx)(Layout, { maxWidth: maxWidth, as: "div", "data-testid": "layout", children: (0, jsx_runtime_1.jsx)(PageContainer, { children: visiblePages.map((page, index) => ((0, jsx_runtime_1.jsx)(PageWrapper, { isTransitioning: isTransitioning, direction: direction, currentPage: index === visiblePages.length - 1, isEntering: page.isEntering, isExiting: page.isExiting, zIndex: index, children: page.element }, `${page.path}-${index}`))) }) }) }), (0, jsx_runtime_1.jsx)(stack_dev_roadmap_1.StackDevRoadmap, { visible: showDevTools, pages: visiblePages.map((p) => ({ path: p.path })), currentPath: currentPath })] }));
};
exports.StackRouterProvider = StackRouterProvider;
exports.default = StackRouterProvider;
/**styles */
const LayoutContainer = styled_1.default.div `
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  background: white;
`;
const Layout = styled_1.default.div `
  width: 100%;
  max-width: ${({ maxWidth }) => maxWidth};
  height: 100%;
  position: relative;
  overflow: hidden;
`;
const PageContainer = styled_1.default.div `
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: white;
`;
const slideInRight = (0, react_2.keyframes) `
  from {
    transform: translateX(100%);
    opacity: 0.2;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;
const slideOutLeft = (0, react_2.keyframes) `
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-30%);
    opacity: 0.2;
  }
`;
const slideInLeft = (0, react_2.keyframes) `
  from {
    transform: translateX(-30%);
    opacity: 0.2;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;
const slideOutRight = (0, react_2.keyframes) `
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0.2;
  }
`;
const PageWrapper = styled_1.default.div `
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  z-index: ${({ zIndex }) => zIndex};
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0);
  animation: ${({ isTransitioning, direction, currentPage, isEntering, isExiting, }) => {
    if (!isTransitioning)
        return "none";
    if (direction === "forward") {
        if (isExiting) {
            return (0, react_2.css) `
          ${slideInRight} ${constants_1.STACK_TRANSITION_MS}ms ease-in-out forwards
        `;
        }
        if (isEntering) {
            return (0, react_2.css) `
          ${slideOutLeft} ${constants_1.STACK_TRANSITION_MS}ms ease-in-out forwards
        `;
        }
    }
    else {
        if (isExiting) {
            return (0, react_2.css) `
          ${slideOutRight} ${constants_1.STACK_TRANSITION_MS}ms ease-in-out forwards
        `;
        }
        if (isEntering) {
            return (0, react_2.css) `
          ${slideInLeft} ${constants_1.STACK_TRANSITION_MS}ms ease-in-out forwards
        `;
        }
    }
    return "none";
}};
  animation-fill-mode: forwards;

  &:active {
    cursor: grabbing;
  }
`;
