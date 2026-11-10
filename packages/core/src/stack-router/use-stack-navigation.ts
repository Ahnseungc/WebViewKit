import { useEffect, useState, useSyncExternalStore } from "react";
import type { Activity } from "../react-types";
import {
  createStackNavigator,
  type StackNavigator,
  type StackNavigatorActions,
  type StackNavigatorOptions,
} from "./navigator";
import type { StackState } from "./stack-reducer";

export type StackNavigationOptions = StackNavigatorOptions<Activity>;

export interface StackNavigation extends StackNavigatorActions {
  state: StackState;
  navigator: StackNavigator<Activity>;
}

/** `createStackNavigator` 의 React 바인딩 */
export function useStackNavigation(
  options: StackNavigationOptions
): StackNavigation {
  const [navigator] = useState(() => createStackNavigator(options));
  navigator.setOptions(options);

  useEffect(() => navigator.start(), [navigator]);

  const state = useSyncExternalStore(
    navigator.subscribe,
    navigator.getState,
    navigator.getState
  );

  return {
    state,
    navigator,
    push: navigator.push,
    replace: navigator.replace,
    reset: navigator.reset,
    resetPush: navigator.resetPush,
    back: navigator.back,
    pop: navigator.pop,
    popTo: navigator.popTo,
    endTransition: navigator.endTransition,
    awaitTransitionStart: navigator.awaitTransitionStart,
    onTransitionStart: navigator.onTransitionStart,
  };
}
