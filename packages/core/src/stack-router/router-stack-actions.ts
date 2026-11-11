import {
  connectStackBridge,
  type ConnectStackBridgeOptions,
} from "./bridge-sync";
import type { RouterStack } from "./router-stack";

/** 외부 라우터의 이동 함수 (React Router `navigate`, Next `router`, Nuxt `navigateTo`, SvelteKit `goto` 등) */
export interface RouterDriver {
  navigate: (path: string, options?: { replace?: boolean }) => void;
  /** history.go 와 같다. 음수면 뒤로 */
  go: (delta: number) => void;
}

export interface RouterStackActionOptions {
  /** 루트에서 back 했을 때 (WebView 닫기 등). 호출 시점에 읽는다 */
  onBackAtRoot?: () => void;
}

export interface RouterStackActions {
  push: (path: string) => boolean;
  replace: (path: string) => boolean;
  /** 스택을 비우고 path 하나로 시작한다. 브라우저 history 뒤쪽 기록은 라우터가 그대로 둔다 */
  reset: (path: string) => boolean;
  back: () => boolean;
  pop: (count?: number) => boolean;
}

/** 스택 깊이를 보고 라우터로 이동한다. 스택 상태는 라우터 location 이 바뀐 뒤 `sync` 로 반영된다 */
export function createRouterStackActions(
  stack: Pick<RouterStack, "getState" | "expectReset">,
  driver: RouterDriver,
  options: RouterStackActionOptions = {}
): RouterStackActions {
  const pop = (count: number = 1) => {
    const depth = stack.getState().entries.length;
    if (depth <= 1) {
      options.onBackAtRoot?.();
      return false;
    }
    driver.go(-Math.min(Math.max(1, count), depth - 1));
    return true;
  };

  return {
    push: (path) => {
      driver.navigate(path);
      return true;
    },
    replace: (path) => {
      driver.navigate(path, { replace: true });
      return true;
    },
    reset: (path) => {
      stack.expectReset();
      driver.navigate(path, { replace: true });
      return true;
    },
    back: () => pop(1),
    pop,
  };
}

/** 라우터 스택 ↔ 네이티브 브릿지. native `stack.*`·`back.request` 를 라우터 이동으로 바꾼다. 반환값은 정리 함수 */
export function connectRouterStackBridge(
  stack: Pick<RouterStack, "getState" | "subscribe">,
  actions: RouterStackActions,
  options: ConnectStackBridgeOptions = {}
): () => void {
  return connectStackBridge(
    {
      getState: stack.getState,
      subscribe: stack.subscribe,
      push: actions.push,
      replace: actions.replace,
      reset: actions.reset,
      back: actions.back,
    },
    options
  );
}
