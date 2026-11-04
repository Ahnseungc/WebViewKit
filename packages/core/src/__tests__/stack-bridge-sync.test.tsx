import { act, render, waitFor } from "@testing-library/react";
import React from "react";
import {
  BACK_REQUEST_METHOD,
  createBridgeEnvelope,
  serializeBridgeMessage,
  STACK_BRIDGE_METHODS,
} from "../bridge/protocol";
import StackRouterProvider, {
  type StackRouterContextValue,
  useStackRouter,
} from "../stack-router/stack-router-provider";

let router: StackRouterContextValue;
const Probe = () => {
  router = useStackRouter();
  return null;
};

const activities = [
  { path: "/home", element: <Probe /> },
  { path: "/detail", element: <Probe /> },
];

const sentMessages = (postMessage: jest.Mock) =>
  postMessage.mock.calls.map(([raw]) => JSON.parse(raw as string));

const ingress = (method: string, payload?: unknown) =>
  act(async () => {
    window.webviewkitBridge?.postMessage(
      serializeBridgeMessage(createBridgeEnvelope(method, payload))
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const renderWithBridge = (onBackAtRoot = jest.fn()) =>
  render(
    <StackRouterProvider
      initialActivity={{ path: "/home", element: <Probe /> }}
      Activities={activities}
      duration={0}
      enableDevTools={false}
      bridge
      onBackAtRoot={onBackAtRoot}
    />
  );

describe("StackRouterProvider bridge 연동 (F-01, F-02)", () => {
  let postMessage: jest.Mock;

  beforeEach(() => {
    window.history.replaceState(null, "", "/home");
    postMessage = jest.fn();
    window.ReactNativeWebView = { postMessage };
  });

  afterEach(() => {
    delete window.ReactNativeWebView;
  });

  it("native stack.push 가 웹 스택에 반영된다", async () => {
    renderWithBridge();

    await ingress(STACK_BRIDGE_METHODS.PUSH, { url: "/detail" });

    expect(router.currentPath).toBe("/detail");
  });

  it("웹 스택이 바뀌면 stack.changed 를 보낸다", async () => {
    renderWithBridge();

    act(() => {
      router.push("/detail");
    });

    await waitFor(() =>
      expect(sentMessages(postMessage)).toContainEqual(
        expect.objectContaining({
          method: STACK_BRIDGE_METHODS.CHANGED,
          payload: { depth: 2, path: "/detail" },
        })
      )
    );
  });

  it("back.request 는 depth > 1 이면 pop 하고 handled: true 를 회신한다", async () => {
    renderWithBridge();
    act(() => {
      router.push("/detail");
    });

    await ingress(BACK_REQUEST_METHOD);

    await waitFor(() => expect(router.depth).toBe(1));
    const response = sentMessages(postMessage).find((m) => m.replyTo);
    expect(response.payload).toEqual({ handled: true });
  });

  it("루트의 back.request 는 onBackAtRoot 후 handled: false 를 회신한다", async () => {
    const onBackAtRoot = jest.fn();
    renderWithBridge(onBackAtRoot);

    await ingress(BACK_REQUEST_METHOD);

    const response = sentMessages(postMessage).find((m) => m.replyTo);
    expect([onBackAtRoot.mock.calls.length, response.payload]).toEqual([
      1,
      { handled: false },
    ]);
  });
});
