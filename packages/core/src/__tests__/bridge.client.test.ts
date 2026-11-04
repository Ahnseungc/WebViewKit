import { createWebViewBridgeClient } from "../bridge/client";
import { BRIDGE_ERROR_CODES } from "../bridge/errors";
import { handleBridgeMessage } from "../bridge/host";
import {
  createBridgeResponse,
  FLUTTER_LEGACY_STACK_HANDLERS,
  STACK_BRIDGE_METHODS,
} from "../bridge/protocol";
import {
  createStackRouterBridge,
  getStackRouterBridge,
  resetStackRouterBridgeCache,
} from "../bridge/stack-router-bridge";

describe("bridge client", () => {
  beforeEach(() => {
    delete window.ReactNativeWebView;
    delete window.flutter_inappwebview;
    delete window.stackRouterBridge;
    resetStackRouterBridgeCache();
  });

  it("RN 은 envelope 를 postMessage 로 보낸다", async () => {
    const postMessage = jest.fn();
    window.ReactNativeWebView = { postMessage };

    await createStackRouterBridge()?.push("/rn", { tab: "home" });

    const sent = JSON.parse(postMessage.mock.calls[0][0]);
    expect(sent).toMatchObject({
      method: STACK_BRIDGE_METHODS.PUSH,
      payload: { url: "/rn", meta: { tab: "home" } },
    });
  });

  it("Flutter callHandler 반환값을 result 로 돌려준다 (E-32)", async () => {
    window.flutter_inappwebview = {
      callHandler: jest.fn().mockResolvedValue({ ok: true }),
    };

    const response = await createStackRouterBridge()?.push("/x");

    expect(response?.result).toEqual({ ok: true });
  });

  it("Flutter pop 은 legacy 핸들러를 인자 없이 호출한다", async () => {
    const callHandler = jest.fn().mockResolvedValue(true);
    window.flutter_inappwebview = { callHandler };

    await createStackRouterBridge()?.pop();

    expect(callHandler).toHaveBeenCalledWith(FLUTTER_LEGACY_STACK_HANDLERS.pop);
  });

  it("reset 은 meta 를 전달한다 (E-36)", async () => {
    const postMessage = jest.fn();
    window.ReactNativeWebView = { postMessage };

    await createStackRouterBridge()?.reset("/home", { tab: 1 });

    expect(JSON.parse(postMessage.mock.calls[0][0]).payload).toEqual({
      url: "/home",
      meta: { tab: 1 },
    });
  });

  it("응답이 늦으면 TIMEOUT 으로 reject (E-32)", async () => {
    window.flutter_inappwebview = {
      callHandler: () => new Promise(() => undefined),
    };
    const client = createWebViewBridgeClient({ timeoutMs: 10 });

    await expect(client.stackPop()).rejects.toMatchObject({
      code: BRIDGE_ERROR_CODES.TIMEOUT,
    });
  });

  it("RN postMessage 가 throw 하면 BRIDGE_UNAVAILABLE (E-38)", async () => {
    window.ReactNativeWebView = {
      postMessage: () => {
        throw new Error("not ready");
      },
    };

    await expect(createStackRouterBridge()?.push("/x")).rejects.toMatchObject({
      code: BRIDGE_ERROR_CODES.BRIDGE_UNAVAILABLE,
    });
  });

  it("outbound 도 위험한 URL 을 거부한다", async () => {
    window.ReactNativeWebView = { postMessage: jest.fn() };

    await expect(
      createStackRouterBridge()?.push("javascript:alert(1)")
    ).rejects.toMatchObject({ code: BRIDGE_ERROR_CODES.URL_NOT_ALLOWED });
  });

  it("RN expectResponse 면 replyTo 응답 payload 로 resolve 한다", async () => {
    const postMessage = jest.fn();
    window.ReactNativeWebView = { postMessage };
    const client = createWebViewBridgeClient();

    const pending = client.request("app.version", undefined, {
      expectResponse: true,
    });
    await Promise.resolve();
    const request = JSON.parse(postMessage.mock.calls[0][0]);
    await handleBridgeMessage(
      createBridgeResponse(request, { payload: { version: "3.1.0" } }),
      {}
    );

    await expect(pending).resolves.toMatchObject({
      result: { version: "3.1.0" },
    });
  });

  it("RN 응답에 error 가 있으면 그 code 로 reject", async () => {
    const postMessage = jest.fn();
    window.ReactNativeWebView = { postMessage };
    const client = createWebViewBridgeClient();

    const pending = client.request("app.version", undefined, {
      expectResponse: true,
    });
    await Promise.resolve();
    const request = JSON.parse(postMessage.mock.calls[0][0]);
    await handleBridgeMessage(
      createBridgeResponse(request, {
        error: { code: "NOT_SUPPORTED", message: "nope" },
      }),
      {}
    );

    await expect(pending).rejects.toMatchObject({ code: "NOT_SUPPORTED" });
  });

  it("브라우저에서는 createStackRouterBridge 가 null", () => {
    expect(createStackRouterBridge()).toBeNull();
  });

  it("getStackRouterBridge 는 같은 인스턴스를 재사용한다 (E-40)", () => {
    window.ReactNativeWebView = { postMessage: jest.fn() };

    expect(getStackRouterBridge()).toBe(getStackRouterBridge());
  });
});
