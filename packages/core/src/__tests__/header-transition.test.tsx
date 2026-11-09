import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import StackRouterProvider, {
  type StackRouterContextValue,
  useStackRouter,
} from "../stack-router/stack-router-provider";
import type { StackRouterProviderProps } from "../type";

const TEST_DURATION_MS = 20;

let router: StackRouterContextValue;
const Probe = () => {
  router = useStackRouter();
  return null;
};

const activities = [
  { path: "/p1", element: <Probe /> },
  { path: "/p2", element: <Probe /> },
  { path: "/p3", element: <Probe /> },
];

const renderRouter = (props: Partial<StackRouterProviderProps> = {}) =>
  render(
    <StackRouterProvider
      initialActivity={{ path: "/p1", element: <Probe /> }}
      Activities={activities}
      duration={TEST_DURATION_MS}
      enableDevTools={false}
      isShowHeader
      {...props}
    />
  );

const titles = () =>
  screen.getAllByRole("heading", { hidden: true }).map((h) => h.textContent);
const exitTitle = () => screen.queryByTestId("wvk-header-exit-title");
const backSlot = () => screen.queryByTestId("wvk-header-back");

const settle = () =>
  waitFor(() => {
    expect(router.isTransitioning).toBe(false);
  });

beforeEach(() => {
  window.history.replaceState(null, "", "/p1");
});

describe("StackHeader 전환", () => {
  it("push 중에는 새 제목과 사라지는 이전 제목을 같이 그린다", async () => {
    renderRouter();

    act(() => {
      router.push("/p2");
    });

    expect(titles()).toEqual(["/p2", "/p1"]);
    expect(exitTitle()).toHaveAttribute("aria-hidden", "true");
    await settle();
    expect(titles()).toEqual(["/p2"]);
    expect(exitTitle()).toBeNull();
  });

  it("루트로 back 하면 back 버튼이 전환 동안 남았다가 사라진다", async () => {
    renderRouter();
    act(() => {
      router.push("/p2");
    });
    await settle();
    expect(backSlot()).not.toBeNull();

    act(() => {
      router.back();
    });
    await waitFor(() => expect(router.depth).toBe(1));

    expect(backSlot()).not.toBeNull();
    expect(titles()).toEqual(["/p1", "/p2"]);
    await settle();
    expect(backSlot()).toBeNull();
  });

  it("back 버튼 유무가 바뀌어도 각 제목은 자기 페이지 기준 들여쓰기를 유지한다", async () => {
    renderRouter();
    act(() => {
      router.push("/p2");
    });
    await settle();

    act(() => {
      router.back();
    });
    await waitFor(() => expect(router.depth).toBe(1));

    const [enter, exit] = screen.getAllByRole("heading", { hidden: true });
    expect(getComputedStyle(enter).paddingLeft).toBe("0px");
    expect(getComputedStyle(exit).paddingLeft).toBe("40px");
    expect(getComputedStyle(backSlot()!).position).toBe("absolute");
  });

  it("headerTransition=false 면 이전 제목을 그리지 않는다", () => {
    renderRouter({ headerTransition: false });

    act(() => {
      router.push("/p2");
    });

    expect(titles()).toEqual(["/p2"]);
    expect(exitTitle()).toBeNull();
  });

  it("transition=none 이면 헤더도 즉시 바뀐다", () => {
    renderRouter({ transition: "none" });

    act(() => {
      router.push("/p2");
    });

    expect(titles()).toEqual(["/p2"]);
  });
});
