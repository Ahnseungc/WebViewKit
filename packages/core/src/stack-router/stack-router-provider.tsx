import React, { createContext, useContext, useEffect, useState } from "react";
import { history } from "../history";
import styled from "@emotion/styled";
import { keyframes, css } from "@emotion/react";
import {
  HistoryAction,
  HistoryState,
  Direction,
  DirectionType,
  StackRouterProviderProps,
  VisiblePage,
} from "../type";

interface StackRouterContextProps {
  currentPath: string;
  currentState: HistoryState;
  Activities: { path: string; element: React.ReactNode }[];
  initialActivity: { path: string; element: React.ReactNode };
  push: (path: string, data?: any) => void;
  replace: (path: string, data?: any) => void;
  back: () => void;
  forward: () => void;
  visiblePages: { path: string; element: React.ReactNode }[];
}

const StackRouterContext = createContext<StackRouterContextProps | null>(null);

export const useStackRouter = () => {
  const context = useContext(StackRouterContext);
  if (!context) {
    throw new Error("useStackRouter must be used within a StackRouterProvider");
  }
  return context;
};

const StackRouter = ({
  maxWidth = "600px",
  Activities = [],
  initialActivity,
}: StackRouterProviderProps) => {
  const [currentPath, setCurrentPath] = useState(
    history.getCurrentState().path
  );
  const [currentState, setCurrentState] = useState(history.getCurrentState());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<DirectionType>(Direction.FORWARD);
  const [visiblePages, setVisiblePages] = useState<Array<VisiblePage>>([]);

  // initialize visible pages
  useEffect(() => {
    setVisiblePages([
      {
        path: initialActivity.path,
        element: initialActivity.element,
        isEntering: true,
      },
    ]);
  }, [initialActivity]);

  // listen to history changes
  useEffect(() => {
    const removeListener = history.addListener((state) => {
      if (!isTransitioning || direction !== Direction.BACKWARD) {
        setCurrentPath(state?.path);
        setCurrentState(state);
      }
      setIsTransitioning(true);
      setDirection(
        state?.action === HistoryAction.POP
          ? Direction.BACKWARD
          : Direction.FORWARD
      );
    });

    return () => {
      removeListener();
    };
  }, [isTransitioning, direction]);

  // handle back
  const handleBack = () => {
    setIsTransitioning(true);
    setDirection(Direction.BACKWARD);

    setTimeout(() => {
      setVisiblePages((prev) => prev.slice(0, -1));
    }, 500);
    history.back();
  };

  // update current path
  useEffect(() => {
    if (visiblePages.length > 0) {
      setCurrentPath(visiblePages[visiblePages.length - 1].path);
    }
  }, [visiblePages]);

  // handle push
  const handlePush = (path: string, data?: any) => {
    setIsTransitioning(true);
    setDirection(Direction.FORWARD);

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
      }, 500);
    }

    history.push(path, data);
  };

  const value: StackRouterContextProps = {
    currentPath,
    currentState,
    initialActivity,
    Activities,
    visiblePages,
    push: handlePush,
    replace: history.replace,
    back: handleBack,
    forward: history.forward,
  };

  return (
    <StackRouterContext.Provider value={value}>
      <LayoutContainer>
        <Layout maxWidth={maxWidth}>
          <PageContainer>
            {visiblePages.map((page, index) => (
              <PageWrapper
                key={`${page.path}-${index}`}
                isTransitioning={isTransitioning}
                direction={direction}
                currentPage={index === visiblePages.length - 1}
                isEntering={page.isEntering}
                isExiting={page.isExiting}
                zIndex={index}
              >
                {page.element}
              </PageWrapper>
            ))}
          </PageContainer>
        </Layout>
      </LayoutContainer>
    </StackRouterContext.Provider>
  );
};

export default StackRouter;

/**styles */
const LayoutContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  background: white;
`;

const Layout = styled.div<{ maxWidth: string }>`
  width: 100%;
  max-width: ${({ maxWidth }) => maxWidth};
  height: 100%;
  position: relative;
  overflow: hidden;
`;

const PageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: white;
`;

const slideInRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0.2;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOutLeft = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-30%);
    opacity: 0.2;
  }
`;

const slideInLeft = keyframes`
  from {
    transform: translateX(-30%);
    opacity: 0.2;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOutRight = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0.2;
  }
`;

const PageWrapper = styled.div<{
  isTransitioning: boolean;
  direction: "forward" | "backward";
  currentPage: boolean;
  isEntering?: boolean;
  isExiting?: boolean;
  zIndex: number;
}>`
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
  animation: ${({
    isTransitioning,
    direction,
    currentPage,
    isEntering,
    isExiting,
  }) => {
    if (!isTransitioning) return "none";

    if (direction === "forward") {
      if (isExiting) {
        return css`
          ${slideInRight} 0.7s ease-in-out forwards
        `;
      }
      if (isEntering) {
        return css`
          ${slideOutLeft} 0.7s ease-in-out forwards
        `;
      }
    } else {
      if (isExiting) {
        return css`
          ${slideOutRight} 0.7s ease-in-out forwards
        `;
      }
      if (isEntering) {
        return css`
          ${slideInLeft} 0.7s ease-in-out forwards
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
