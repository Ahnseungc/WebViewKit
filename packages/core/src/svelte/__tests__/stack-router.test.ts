import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BACK_REQUEST_METHOD,
  createBridgeEnvelope,
  serializeBridgeMessage,
  STACK_BRIDGE_METHODS,
} from "../../core.js";
import StackRouter from "../StackRouter.svelte";
import type { StackRouterProps, SvelteActivity } from "../types.js";
import Detail from "./Detail.svelte";
import Home from "./Home.svelte";
import List from "./List.svelte";
import OutsideHeader from "./OutsideHeader.svelte";
import { probe } from "./probe.js";

const activities: SvelteActivity[] = [
  { path: "/detail/:id", component: Detail },
  { path: "/list", component: List, keepAlive: true },
];

const router = () => probe.router!;

const renderRouter = (props: Partial<StackRouterProps> = {}) =>
  render(StackRouter, {
    props: {
      initialActivity: { path: "/", component: Home },
      activities,
      duration: 0,
      ...props,
    },
  });

const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 20));
  await tick();
};

/** back 계열은 history.go 의 popstate 까지 기다려야 다음 이동이 풀린다 */
const go = async (action: () => unknown) => {
  action();
  await settle();
};

const pageOf = (container: HTMLElement, testId: string) =>
  container.querySelector(`[data-testid="${testId}"]`)!.parentElement!;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  probe.router = null;
  probe.revived.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Svelte StackRouter", () => {
  it("push 하면 페이지가 쌓이고 params·query 가 전달된다", async () => {
    const { getByTestId } = renderRouter();

    await go(() => router().push("/detail/7?tab=info"));

    expect(getByTestId("detail-7").textContent?.trim()).toBe("7:info");
    expect([router().depth, router().currentPath, router().canGoBack]).toEqual([
      2,
      "/detail/7?tab=info",
      true,
    ]);
    expect(window.location.pathname).toBe("/detail/7");
  });

  it("top 이 아닌 페이지는 covered·inert·aria-hidden 이다", async () => {
    const { container } = renderRouter();

    await go(() => router().push("/detail/1"));

    const home = pageOf(container, "home");
    expect(home.getAttribute("data-state")).toBe("covered");
    expect(home.hasAttribute("inert")).toBe(true);
    expect(home.getAttribute("aria-hidden")).toBe("true");
    expect(pageOf(container, "detail-1").hasAttribute("inert")).toBe(false);
  });

  it("back 하면 이전 페이지로 돌아간다", async () => {
    const { queryByTestId } = renderRouter();
    await go(() => router().push("/detail/1"));

    await go(() => router().back());

    expect(queryByTestId("detail-1")).toBeNull();
    expect(router().depth).toBe(1);
  });

  it("브라우저 back(popstate)도 스택을 줄인다", async () => {
    renderRouter();
    await go(() => router().push("/detail/1"));

    await go(() => window.history.back());
    await settle();

    expect(router().currentPath).toBe("/");
  });

  it("keepAlive 페이지는 back 뒤에도 state 를 유지하고 되살아날 때 useOnRevive 가 불린다", async () => {
    const { container, getByTestId } = renderRouter();
    await go(() => router().push("/list"));
    await fireEvent.input(getByTestId("list"), { target: { value: "draft" } });
    await go(() => router().back());

    expect(pageOf(container, "list").getAttribute("data-state")).toBe("cached");

    await go(() => router().push("/list", { from: "home" }));

    const input = getByTestId("list") as HTMLInputElement;
    expect([input.value, probe.revived]).toEqual(["draft", [{ from: "home" }]]);
  });

  it("전환은 들어오는 페이지의 animationend 에서 끝난다", async () => {
    const { container } = renderRouter({ duration: 300 });
    router().push("/detail/1");
    await tick();

    expect(router().isTransitioning).toBe(true);
    const entering = pageOf(container, "detail-1");
    expect(entering.getAttribute("data-transition")).toBe("slide");

    await fireEvent.animationEnd(entering);

    expect(router().isTransitioning).toBe(false);
  });

  it("isShowHeader 면 페이지마다 헤더를 그리고 back 버튼이 동작한다", async () => {
    const { container } = renderRouter({ isShowHeader: true });
    await go(() => router().push("/detail/2"));

    const header = pageOf(container, "detail-2").querySelector("header")!;
    expect(header.querySelector("h1")!.textContent?.trim()).toBe("/detail/2");

    await fireEvent.click(header.querySelector("button")!);
    await settle();

    expect(router().depth).toBe(1);
  });

  it("등록되지 않은 경로는 onNotFound 를 부르고 이동하지 않는다", async () => {
    const onNotFound = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    renderRouter({ onNotFound });

    await go(() => router().push("/nope"));

    expect([onNotFound.mock.calls, router().depth]).toEqual([[["/nope"]], 1]);
  });

  it("StackHeader 를 라우터 밖에서 쓰면 알려 준다", () => {
    expect(() => render(OutsideHeader)).toThrow(/StackRouter/);
  });
});

describe("Svelte StackRouter bridge", () => {
  let postMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    postMessage = vi.fn();
    window.ReactNativeWebView = { postMessage };
  });

  afterEach(() => {
    delete window.ReactNativeWebView;
  });

  const sent = () =>
    postMessage.mock.calls.map(([raw]) => JSON.parse(raw as string));

  const ingress = async (method: string, payload?: unknown) => {
    window.webviewkitBridge?.postMessage(
      serializeBridgeMessage(createBridgeEnvelope(method, payload))
    );
    await settle();
  };

  it("native stack.push 가 반영되고 stack.changed 를 보낸다", async () => {
    renderRouter({ bridge: true });

    await ingress(STACK_BRIDGE_METHODS.PUSH, { url: "/detail/3" });

    expect(router().currentPath).toBe("/detail/3");
    expect(sent()).toContainEqual(
      expect.objectContaining({
        method: STACK_BRIDGE_METHODS.CHANGED,
        payload: { depth: 2, path: "/detail/3" },
      })
    );
  });

  it("루트의 back.request 는 onBackAtRoot 후 handled: false", async () => {
    const onBackAtRoot = vi.fn();
    renderRouter({ bridge: true, onBackAtRoot });

    await ingress(BACK_REQUEST_METHOD);

    const response = sent().find((message) => message.replyTo);
    expect([onBackAtRoot.mock.calls.length, response.payload]).toEqual([
      1,
      { handled: false },
    ]);
  });
});
