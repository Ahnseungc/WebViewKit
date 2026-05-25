import {
  FLUTTER_LEGACY_STACK_HANDLERS,
  STACK_BRIDGE_METHODS,
  createBridgeEnvelope,
  serializeBridgeMessage,
} from "../bridge/protocol";
import { handleBridgeMessage, installBridgeHost } from "../bridge/host";
import { createStackRouterBridge } from "../bridge/stack-router-bridge";

describe("bridge host", () => {
  beforeEach(() => {
    delete (window as Window).webviewkitBridge;
    delete (window as Window).stackRouterBridge;
    delete (window as Window).stackPush;
    delete (window as Window).ReactNativeWebView;
    delete (window as Window).flutter_inappwebview;
  });

  it("routes stack.push to host handlers", async () => {
    const push = jest.fn().mockResolvedValue(true);
    await handleBridgeMessage(
      createBridgeEnvelope(STACK_BRIDGE_METHODS.PUSH, {
        url: "/detail",
        meta: { from: "test" },
      }),
      { stack: { push, replace: jest.fn(), pop: jest.fn(), reset: jest.fn() } }
    );
    expect(push).toHaveBeenCalledWith("/detail", { from: "test" });
  });

  it("exposes legacy window.stackPush", async () => {
    const push = jest.fn().mockResolvedValue(true);
    const cleanup = installBridgeHost({
      stack: {
        push,
        replace: jest.fn(),
        pop: jest.fn(),
        reset: jest.fn(),
      },
    });
    await window.stackPush?.("/x");
    expect(push).toHaveBeenCalledWith("/x", null);
    cleanup();
  });

  it("sends stack push via React Native postMessage", async () => {
    const postMessage = jest.fn();
    window.ReactNativeWebView = { postMessage };

    const bridge = createStackRouterBridge();
    await bridge?.push("/rn", { tab: "home" });

    expect(postMessage).toHaveBeenCalledTimes(1);
    const raw = postMessage.mock.calls[0][0] as string;
    const parsed = JSON.parse(raw);
    expect(parsed.method).toBe(STACK_BRIDGE_METHODS.PUSH);
    expect(parsed.payload.url).toBe("/rn");
  });

  it("sends stack pop via Flutter legacy handler", async () => {
    const callHandler = jest.fn().mockResolvedValue(true);
    window.flutter_inappwebview = { callHandler };

    const bridge = createStackRouterBridge();
    await bridge?.pop();

    expect(callHandler).toHaveBeenCalledWith(FLUTTER_LEGACY_STACK_HANDLERS.pop);
  });

  it("accepts ingress via window.webviewkitBridge.postMessage", async () => {
    const pop = jest.fn().mockResolvedValue(true);
    installBridgeHost({
      stack: {
        push: jest.fn(),
        replace: jest.fn(),
        pop,
        reset: jest.fn(),
      },
    });

    window.webviewkitBridge?.postMessage(
      serializeBridgeMessage(createBridgeEnvelope(STACK_BRIDGE_METHODS.POP))
    );

    await Promise.resolve();
    expect(pop).toHaveBeenCalled();
  });
});
