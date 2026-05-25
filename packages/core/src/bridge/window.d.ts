import type { StackRouterBridge } from "./stack-router-bridge";
import type { StackMeta } from "./protocol";

export type FlutterInAppWebViewBridge = {
  callHandler: (handlerName: string, ...args: unknown[]) => Promise<unknown>;
};

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    flutter_inappwebview?: FlutterInAppWebViewBridge;
    /** Native → web: unified protocol ingress */
    webviewkitBridge?: {
      postMessage: (message: string | unknown) => void;
    };
    /** Web → native stack */
    stackRouterBridge?: StackRouterBridge;
    /** Native → web stack */
    stackPush?: (url: string, meta?: StackMeta) => Promise<boolean>;
    stackReplace?: (url: string, meta?: StackMeta) => Promise<boolean>;
    stackPop?: () => Promise<boolean>;
    stackReset?: (url: string, meta?: StackMeta) => Promise<boolean>;
  }
}

export {};
