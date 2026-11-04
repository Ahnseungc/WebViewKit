import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React, { useState } from "react";
import { useActivity, useParams } from "../stack-router/activity-context";
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

const Counter = ({ id }: { id: string }) => {
  const [count, setCount] = useState(0);
  return (
    <button data-testid={`count-${id}`} onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
};

const Page = ({ id }: { id: string }) => (
  <div data-testid={id}>
    <Probe />
    <Counter id={id} />
  </div>
);

const Detail = () => {
  const { id } = useParams<{ id: string }>();
  const { query, data } = useActivity();
  return (
    <div data-testid="detail">
      <Probe />
      {`id=${id} tab=${query.tab ?? ""} data=${JSON.stringify(data ?? null)}`}
    </div>
  );
};

const activities = [
  { path: "/p1", element: <Page id="p1" /> },
  { path: "/p2", element: <Page id="p2" /> },
  { path: "/p3", element: <Page id="p3" /> },
  { path: "/detail/:id", element: <Detail /> },
];

const renderRouter = (props: Partial<StackRouterProviderProps> = {}) =>
  render(
    <StackRouterProvider
      initialActivity={{ path: "/p1", element: <Page id="p1" /> }}
      Activities={activities}
      duration={TEST_DURATION_MS}
      enableDevTools={false}
      {...props}
    />
  );

const wrapperOf = (testId: string) => screen.getByTestId(testId).parentElement!;
const pageStates = () =>
  Array.from(screen.getByTestId("layout").querySelectorAll("[data-state]")).map(
    (element) =>
      `${element.firstElementChild?.getAttribute("data-testid")}:${element.getAttribute("data-state")}`
  );

const settle = () =>
  waitFor(() => {
    expect(router.isTransitioning).toBe(false);
  });

const pushAndSettle = async (path: string, data?: unknown) => {
  act(() => {
    router.push(path, data);
  });
  await settle();
};

const backAndSettle = async () => {
  const depth = router.depth;
  act(() => {
    router.back();
  });
  await waitFor(() => expect(router.depth).toBe(depth - 1));
  await settle();
};

beforeEach(() => {
  window.history.replaceState(null, "", "/p1");
});

describe("StackRouterProvider", () => {
  it("초기 페이지를 idle 로 렌더한다", () => {
    renderRouter();

    expect(pageStates()).toEqual(["p1:idle"]);
  });

  it("push 하면 URL 이 바뀌고 새 페이지가 top 이 된다", async () => {
    renderRouter();

    await pushAndSettle("/p2");

    expect(window.location.pathname).toBe("/p2");
    expect(pageStates()).toEqual(["p1:covered", "p2:idle"]);
  });

  it("push 중에는 새 top 이 enter, 이전 top 이 exit 이다", () => {
    renderRouter();

    act(() => {
      router.push("/p2");
    });

    expect(pageStates()).toEqual(["p1:exit", "p2:enter"]);
  });

  it("3단에서 back 하면 top 만 퇴장하고 아래 페이지는 enter 로 다시 보인다 (E-01)", async () => {
    renderRouter();
    await pushAndSettle("/p2");
    await pushAndSettle("/p3");

    act(() => {
      router.back();
    });
    await waitFor(() => expect(router.depth).toBe(2));

    expect(pageStates()).toEqual(["p1:covered", "p2:enter", "p3:exit"]);
    await settle();
    expect(pageStates()).toEqual(["p1:covered", "p2:idle"]);
    expect(window.location.pathname).toBe("/p2");
  });

  it("전환이 끝나면 top 이 아닌 페이지는 covered (E-02)", async () => {
    renderRouter();
    await pushAndSettle("/p2");
    await pushAndSettle("/p3");

    expect(pageStates()).toEqual(["p1:covered", "p2:covered", "p3:idle"]);
  });

  it("브라우저·하드웨어 back(popstate)도 스택을 pop 한다 (E-03)", async () => {
    renderRouter();
    await pushAndSettle("/p2");

    act(() => {
      window.history.back();
    });
    await waitFor(() => expect(router.depth).toBe(1));

    expect(router.currentPath).toBe("/p1");
    expect(window.location.pathname).toBe("/p1");
  });

  it("브라우저 forward 는 같은 엔트리를 다시 push 한다", async () => {
    renderRouter();
    await pushAndSettle("/p2");
    await backAndSettle();

    act(() => {
      window.history.forward();
    });
    await waitFor(() => expect(router.depth).toBe(2));

    expect(router.currentPath).toBe("/p2");
  });

  it("부모가 인라인 initialActivity 로 리렌더해도 스택이 유지된다 (E-04)", async () => {
    const { rerender } = renderRouter();
    await pushAndSettle("/p2");

    rerender(
      <StackRouterProvider
        initialActivity={{ path: "/p1", element: <Page id="p1" /> }}
        Activities={activities}
        duration={TEST_DURATION_MS}
        enableDevTools={false}
      />
    );

    expect(router.depth).toBe(2);
  });

  it("루트에서 back 하면 history 를 건드리지 않고 onBackAtRoot 를 호출한다 (E-05)", () => {
    const onBackAtRoot = jest.fn();
    const go = jest.spyOn(window.history, "go");
    renderRouter({ onBackAtRoot });

    let result = true;
    act(() => {
      result = router.back();
    });

    expect({
      result,
      called: onBackAtRoot.mock.calls.length,
      go: go.mock.calls.length,
      depth: router.depth,
    }).toEqual({
      result: false,
      called: 1,
      go: 0,
      depth: 1,
    });
    go.mockRestore();
  });

  it("딥링크 진입 시 with-root 정책으로 [root, 대상] 을 복원한다 (E-06)", async () => {
    window.history.replaceState(null, "", "/detail/7?tab=info");
    renderRouter();

    await waitFor(() => expect(router.depth).toBe(2));

    expect(screen.getByTestId("detail")).toHaveTextContent("id=7 tab=info");
    await backAndSettle();
    expect(window.location.pathname).toBe("/p1");
  });

  it("딥링크 진입 시 top-only 정책은 대상 한 장만 둔다", async () => {
    window.history.replaceState(null, "", "/p3");
    renderRouter({ restoreStack: "top-only" });

    await waitFor(() => expect(router.currentPath).toBe("/p3"));

    expect(router.depth).toBe(1);
  });

  it("같은 tick 에 push 를 두 번 하면 두 번째는 무시된다 (E-07)", async () => {
    renderRouter();

    let results: boolean[] = [];
    act(() => {
      results = [router.push("/p2"), router.push("/p3")];
    });
    await settle();

    expect({
      results,
      depth: router.depth,
      url: window.location.pathname,
    }).toEqual({
      results: [true, false],
      depth: 2,
      url: "/p2",
    });
  });

  it("미등록 경로는 URL 을 바꾸지 않고 onNotFound 를 호출한다 (E-08)", () => {
    const onNotFound = jest.fn();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    renderRouter({ onNotFound });

    let result = true;
    act(() => {
      result = router.push("/nope");
    });

    expect({
      result,
      url: window.location.pathname,
      notFound: onNotFound.mock.calls[0],
    }).toEqual({
      result: false,
      url: "/p1",
      notFound: ["/nope"],
    });
    warn.mockRestore();
  });

  it("같은 경로를 다시 push 해도 기존 페이지 상태는 유지되고 새 엔트리가 쌓인다 (E-09)", async () => {
    renderRouter();
    await pushAndSettle("/p2");
    fireEvent.click(screen.getByTestId("count-p2"));
    await pushAndSettle("/p3");
    await pushAndSettle("/p2");

    const counts = screen
      .getAllByTestId("count-p2")
      .map((el) => el.textContent);

    expect(counts).toEqual(["1", "0"]);
  });

  it("replace 는 top 을 교체한다 (E-10)", async () => {
    renderRouter();

    act(() => {
      router.replace("/p2");
    });

    await waitFor(() => expect(pageStates()).toEqual(["p2:idle"]));
    expect(window.location.pathname).toBe("/p2");
  });

  it("reset 은 스택을 한 장으로 만든다", async () => {
    renderRouter();
    await pushAndSettle("/p2");
    await pushAndSettle("/p3");

    act(() => {
      router.reset("/p1");
    });

    await waitFor(() => expect(router.depth).toBe(1));
    expect(router.currentPath).toBe("/p1");
  });

  it("pop(2) 와 popTo 로 여러 장을 한 번에 돌아간다", async () => {
    renderRouter();
    await pushAndSettle("/p2");
    await pushAndSettle("/p3");

    act(() => {
      router.pop(2);
    });
    await waitFor(() => expect(router.depth).toBe(1));
    await settle();
    await pushAndSettle("/p2");
    await pushAndSettle("/p3");
    act(() => {
      router.popTo("/p2");
    });

    await waitFor(() => expect(router.currentPath).toBe("/p2"));
  });

  it("useParams·useActivity 로 페이지별 params·data 를 읽는다 (E-15, E-16)", async () => {
    renderRouter();

    await pushAndSettle("/detail/42", { from: "list" });

    expect(screen.getByTestId("detail")).toHaveTextContent(
      'id=42 tab= data={"from":"list"}'
    );
  });

  it("top 이 아닌 페이지는 inert·aria-hidden (E-19)", async () => {
    renderRouter();
    await pushAndSettle("/p2");

    const below = wrapperOf("p1");

    expect([
      below.hasAttribute("inert"),
      below.getAttribute("aria-hidden"),
    ]).toEqual([true, "true"]);
  });

  it("transition='none' 이면 전환 상태 없이 바로 idle (E-20)", () => {
    renderRouter({ transition: "none" });

    act(() => {
      router.push("/p2");
    });

    expect(pageStates()).toEqual(["p1:covered", "p2:idle"]);
  });

  it("isShowHeader 면 StackHeader 를 렌더한다 (E-21)", () => {
    renderRouter({ isShowHeader: true });

    expect(screen.getByRole("heading")).toHaveTextContent("/p1");
  });

  it("전환 중 언마운트해도 에러가 없다 (E-13)", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = renderRouter();
    act(() => {
      router.push("/p2");
    });
    unmount();
    await new Promise((resolve) => setTimeout(resolve, TEST_DURATION_MS * 3));

    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("maxWidth prop 을 적용한다", () => {
    renderRouter({ maxWidth: "800px" });

    expect(screen.getByTestId("layout")).toHaveStyle({ maxWidth: "800px" });
  });
});
