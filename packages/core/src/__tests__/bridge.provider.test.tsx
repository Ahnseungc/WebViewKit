import { act, render } from "@testing-library/react";
import React from "react";
import { WebViewBridgeProvider } from "../bridge/WebViewBridgeProvider";
import { BRIDGE_HOST_POLL_MS } from "../constants";

const createStack = () => ({
  push: jest.fn().mockReturnValue(true),
  replace: jest.fn().mockReturnValue(true),
  pop: jest.fn().mockReturnValue(true),
  reset: jest.fn().mockReturnValue(true),
});

describe("WebViewBridgeProvider", () => {
  beforeEach(() => {
    delete window.ReactNativeWebView;
    delete window.flutter_inappwebview;
    delete window.stackRouterBridge;
    delete window.stackPush;
    delete window.webviewkitBridge;
  });

  it("인라인 stack 으로 리렌더해도 전역을 재설치하지 않고 최신 핸들러를 쓴다 (E-34)", async () => {
    const first = createStack();
    const second = createStack();
    const { rerender, unmount } = render(
      <WebViewBridgeProvider stack={first} />
    );
    const installed = window.stackPush;

    rerender(<WebViewBridgeProvider stack={second} />);
    await window.stackPush?.("/x");

    expect({
      same: installed === window.stackPush,
      first: first.push.mock.calls.length,
      second: second.push.mock.calls.length,
    }).toEqual({ same: true, first: 0, second: 1 });
    unmount();
  });

  it("Flutter 브릿지가 늦게 주입되어도 outbound 브릿지를 설치한다 (E-30)", async () => {
    const { unmount } = render(<WebViewBridgeProvider stack={createStack()} />);
    expect(window.stackRouterBridge).toBeUndefined();

    window.flutter_inappwebview = { callHandler: jest.fn() };
    await act(async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, BRIDGE_HOST_POLL_MS * 2)
      );
    });

    expect(window.stackRouterBridge).toBeDefined();
    unmount();
  });

  it("언마운트하면 설치한 전역을 정리한다", () => {
    const { unmount } = render(<WebViewBridgeProvider stack={createStack()} />);

    unmount();

    expect([window.stackPush, window.webviewkitBridge]).toEqual([
      undefined,
      undefined,
    ]);
  });
});
