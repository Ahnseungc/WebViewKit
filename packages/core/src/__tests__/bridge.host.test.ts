import { BRIDGE_ERROR_CODES } from "../bridge/errors";
import { handleBridgeMessage, installBridgeHost } from "../bridge/host";
import {
  BACK_REQUEST_METHOD,
  BRIDGE_RESPONSE_METHOD,
  createBridgeEnvelope,
  serializeBridgeMessage,
  STACK_BRIDGE_METHODS,
} from "../bridge/protocol";

const createStack = () => ({
  push: jest.fn().mockResolvedValue(true),
  replace: jest.fn().mockResolvedValue(true),
  pop: jest.fn().mockResolvedValue(true),
  reset: jest.fn().mockResolvedValue(true),
});

const clearGlobals = () => {
  delete window.webviewkitBridge;
  delete window.stackRouterBridge;
  delete window.stackPush;
  delete window.stackReplace;
  delete window.stackPop;
  delete window.stackReset;
  delete window.ReactNativeWebView;
  delete window.flutter_inappwebview;
};

describe("bridge host", () => {
  beforeEach(clearGlobals);

  it("stack.push 를 핸들러로 라우팅한다", async () => {
    const stack = createStack();

    await handleBridgeMessage(
      createBridgeEnvelope(STACK_BRIDGE_METHODS.PUSH, {
        url: "/detail",
        meta: { from: "test" },
      }),
      { stack }
    );

    expect(stack.push).toHaveBeenCalledWith("/detail", { from: "test" });
  });

  it("같은 origin 절대 URL 은 경로로 정규화한다", async () => {
    const stack = createStack();

    await handleBridgeMessage(
      createBridgeEnvelope(STACK_BRIDGE_METHODS.PUSH, {
        url: `${window.location.origin}/a?x=1`,
      }),
      { stack }
    );

    expect(stack.push).toHaveBeenCalledWith("/a?x=1", null);
  });

  it.each(["javascript:alert(1)", "https://evil.example/x", "//evil.example"])(
    "%s 는 URL_NOT_ALLOWED 로 거부한다 (E-31)",
    async (url) => {
      const stack = createStack();
      const onError = jest.fn();

      const handled = await handleBridgeMessage(
        createBridgeEnvelope(STACK_BRIDGE_METHODS.PUSH, { url }),
        { stack, onError }
      );

      expect([
        handled,
        stack.push.mock.calls.length,
        onError.mock.calls[0][0].code,
      ]).toEqual([false, 0, BRIDGE_ERROR_CODES.URL_NOT_ALLOWED]);
    }
  );

  it("allowUrl 로 정책을 바꿀 수 있다", async () => {
    const stack = createStack();

    await handleBridgeMessage(
      createBridgeEnvelope(STACK_BRIDGE_METHODS.PUSH, { url: "app://home" }),
      { stack, allowUrl: (url) => url.startsWith("app://") }
    );

    expect(stack.push).toHaveBeenCalledWith("app://home", null);
  });

  it("url 이 문자열이 아니면 INVALID_PAYLOAD (E-37)", async () => {
    const stack = createStack();
    const onError = jest.fn();

    await handleBridgeMessage(
      createBridgeEnvelope(STACK_BRIDGE_METHODS.PUSH, { url: 123 }),
      { stack, onError }
    );

    expect(onError.mock.calls[0][0].code).toBe(
      BRIDGE_ERROR_CODES.INVALID_PAYLOAD
    );
  });

  it("핸들러 예외는 reject 되지 않고 HANDLER_ERROR 로 전달된다 (E-33)", async () => {
    const onError = jest.fn();
    const stack = {
      ...createStack(),
      pop: () => {
        throw new Error("boom");
      },
    };

    const handled = await handleBridgeMessage(
      createBridgeEnvelope(STACK_BRIDGE_METHODS.POP),
      { stack, onError }
    );

    expect([handled, onError.mock.calls[0][0].code]).toEqual([
      false,
      BRIDGE_ERROR_CODES.HANDLER_ERROR,
    ]);
  });

  it("모르는 method 는 UNKNOWN_METHOD", async () => {
    const onError = jest.fn();

    await handleBridgeMessage(createBridgeEnvelope("foo.bar"), { onError });

    expect(onError.mock.calls[0][0].code).toBe(
      BRIDGE_ERROR_CODES.UNKNOWN_METHOD
    );
  });

  it("legacy window.stackPush 를 노출하고 URL 을 검증한다", async () => {
    const stack = createStack();
    const cleanup = installBridgeHost({ stack, onError: jest.fn() });

    const ok = await window.stackPush?.("/x");
    const blocked = await window.stackPush?.("javascript:alert(1)");

    expect({ ok, blocked, calls: stack.push.mock.calls }).toEqual({
      ok: true,
      blocked: false,
      calls: [["/x", null]],
    });
    cleanup();
  });

  it("window.webviewkitBridge.postMessage 로 ingress 를 받는다", async () => {
    const stack = createStack();
    const cleanup = installBridgeHost({ stack });

    window.webviewkitBridge?.postMessage(
      serializeBridgeMessage(createBridgeEnvelope(STACK_BRIDGE_METHODS.POP))
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(stack.pop).toHaveBeenCalled();
    cleanup();
  });

  it("먼저 설치한 쪽 cleanup 이 나중 설치의 전역을 지우지 않는다 (E-35)", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const first = installBridgeHost({ stack: createStack() });
    const second = installBridgeHost({ stack: createStack() });

    first();

    expect(typeof window.stackPush).toBe("function");
    second();
    expect(window.stackPush).toBeUndefined();
    warn.mockRestore();
  });

  it("exposeStackRouterBridge: true 면 outbound 브릿지를 만든다 (E-39)", () => {
    window.ReactNativeWebView = { postMessage: jest.fn() };

    const cleanup = installBridgeHost({ exposeStackRouterBridge: true });

    expect(window.stackRouterBridge).toBeDefined();
    cleanup();
  });

  it("back.request 에 handled 결과를 bridge.response 로 회신한다", async () => {
    const postMessage = jest.fn();
    window.ReactNativeWebView = { postMessage };
    const request = createBridgeEnvelope(BACK_REQUEST_METHOD);

    await handleBridgeMessage(request, { onBackRequest: () => true });

    const response = JSON.parse(postMessage.mock.calls[0][0]);
    expect(response).toMatchObject({
      method: BRIDGE_RESPONSE_METHOD,
      replyTo: request.id,
      payload: { handled: true },
    });
  });

  it("replyToNative 면 일반 요청에도 에러를 회신한다", async () => {
    const postMessage = jest.fn();
    window.ReactNativeWebView = { postMessage };

    await handleBridgeMessage(
      createBridgeEnvelope(STACK_BRIDGE_METHODS.PUSH, { url: "javascript:x" }),
      { stack: createStack(), replyToNative: true }
    );

    const response = JSON.parse(postMessage.mock.calls[0][0]);
    expect(response.error.code).toBe(BRIDGE_ERROR_CODES.URL_NOT_ALLOWED);
  });
});
