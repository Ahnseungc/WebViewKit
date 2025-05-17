import React, { createContext, useContext, useEffect, useState } from "react";
import { HistoryState, history } from "../history";

interface StackRouterContextProps {
  currentPath: string;
  currentState: HistoryState;
  push: (path: string, data?: any) => void;
  replace: (path: string, data?: any) => void;
  back: () => void;
  forward: () => void;
}

const StackRouterContext = createContext<StackRouterContextProps | null>(null);

export const useStackRouter = () => {
  const context = useContext(StackRouterContext);
  if (!context) {
    throw new Error("useStackRouter must be used within a StackRouterProvider");
  }
  return context;
};

interface StackRouterProviderProps {
  children: React.ReactNode;
}

const StackRouterProvider = ({ children }: StackRouterProviderProps) => {
  const [currentPath, setCurrentPath] = useState(
    history.getCurrentState().path
  );
  const [currentState, setCurrentState] = useState(history.getCurrentState());

  useEffect(() => {
    const removeListener = history.addListener((state) => {
      setCurrentPath(state.path);
      setCurrentState(state);
    });

    return () => {
      removeListener();
    };
  }, []);

  const value: StackRouterContextProps = {
    currentPath,
    currentState,
    push: history.push,
    replace: history.replace,
    back: history.back,
    forward: history.forward,
  };

  return (
    <StackRouterContext.Provider value={value}>
      {children}
    </StackRouterContext.Provider>
  );
};

export default StackRouterProvider;
