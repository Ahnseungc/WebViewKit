import { act, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import StackRouterProvider, {
  type StackRouterContextValue,
  useStackRouter,
} from "../stack-router/stack-router-provider";

const TEST_DURATION_MS = 20;

let router: StackRouterContextValue;
const Probe = () => {
  router = useStackRouter();
  return null;
};

const activities = [
  { path: "/p1", element: <Probe /> },
  { path: "/p2", element: <Probe /> },
];

const renderRouter = () =>
  render(
    <StackRouterProvider
      initialActivity={{ path: "/p1", element: <Probe /> }}
      Activities={activities}
      duration={TEST_DURATION_MS}
      enableDevTools={false}
      isShowHeader
    />
  );

const pages = () =>
  Array.from(
    screen.getByTestId("layout").querySelectorAll<HTMLElement>("[data-state]")
  );

beforeEach(() => {
  window.history.replaceState(null, "", "/p1");
});

describe("StackHeader (페이지별)", () => {
  it("헤더가 각 페이지 안에 있어 페이지와 함께 전환된다", () => {
    renderRouter();

    act(() => {
      router.push("/p2");
    });

    const [lower, upper] = pages();
    expect(lower).toHaveAttribute("data-state", "exit");
    expect(upper).toHaveAttribute("data-state", "enter");
    expect(
      within(lower).getByRole("heading", { hidden: true })
    ).toHaveTextContent("/p1");
    expect(
      within(upper).getByRole("heading", { hidden: true })
    ).toHaveTextContent("/p2");
  });

  it("back 버튼은 루트가 아닌 페이지의 헤더에만 있다", async () => {
    renderRouter();
    act(() => {
      router.push("/p2");
    });
    await waitFor(() => expect(router.isTransitioning).toBe(false));

    const [root, top] = pages();
    expect(within(root).queryByRole("button", { hidden: true })).toBeNull();
    expect(
      within(top).getByRole("button", { name: "뒤로 가기" })
    ).toBeInTheDocument();
  });
});
