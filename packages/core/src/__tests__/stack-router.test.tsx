import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React, { useState } from "react";
import {
  TRANSITION_END_GRACE_MS,
  TRANSITION_START_TIMEOUT_MS,
} from "../constants";
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

  it("back 은 popstate 를 기다리지 않고 클릭 즉시 pop 전환을 시작한다", async () => {
    renderRouter();
    await pushAndSettle("/p2");
    const go = jest.spyOn(window.history, "go").mockImplementation(() => {});

    act(() => {
      router.back();
    });

    expect(pageStates()).toEqual(["p1:enter", "p2:exit"]);
    go.mockRestore();
    await settle();
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

describe("resetPush", () => {
  it("루트만 남기고 새 페이지를 push 한다", async () => {
    renderRouter();
    await pushAndSettle("/p2");
    await pushAndSettle("/p3");

    act(() => {
      router.resetPush("/detail/7");
    });

    expect(pageStates()).toEqual(["p1:covered", "p3:exit", "detail:enter"]);
    await settle();
    await waitFor(() => expect(window.location.pathname).toBe("/detail/7"));
    expect(router.entries.map((entry) => entry.path)).toEqual([
      "/p1",
      "/detail/7",
    ]);
    expect(pageStates()).toEqual(["p1:covered", "detail:idle"]);
  });

  it("resetPush 뒤 back 하면 루트로 돌아간다", async () => {
    renderRouter();
    await pushAndSettle("/p2");
    await pushAndSettle("/p3");
    act(() => {
      router.resetPush("/detail/7");
    });
    await settle();
    await waitFor(() => expect(window.location.pathname).toBe("/detail/7"));

    await backAndSettle();

    expect(pageStates()).toEqual(["p1:idle"]);
    await waitFor(() => expect(window.location.pathname).toBe("/p1"));
  });

  it("루트에서 resetPush 는 push 와 같다", async () => {
    renderRouter();

    act(() => {
      router.resetPush("/p2");
    });
    await settle();

    expect(pageStates()).toEqual(["p1:covered", "p2:idle"]);
    expect(window.location.pathname).toBe("/p2");
  });
});

describe("popStateTransition", () => {
  const SLOW_DURATION_MS = 300;
  /** popstate 로 depth 가 바뀐 첫 렌더의 페이지 상태 */
  const statesWhenDepth = async (depth: number) => {
    let states: string[] = [];
    await waitFor(() => {
      expect(router.depth).toBe(depth);
      states = pageStates();
    });
    return states;
  };

  it("기본(animate)이면 브라우저 back(popstate)도 슬라이드한다", async () => {
    renderRouter();
    await pushAndSettle("/p2");

    act(() => {
      window.history.back();
    });

    expect(await statesWhenDepth(1)).toEqual(["p1:enter", "p2:exit"]);
    await settle();
  });

  it('"none" 이면 브라우저 back(popstate)은 전환 없이 바로 반영한다', async () => {
    renderRouter({ popStateTransition: "none" });
    await pushAndSettle("/p2");

    act(() => {
      window.history.back();
    });

    expect(await statesWhenDepth(1)).toEqual(["p1:idle"]);
    expect(router.isTransitioning).toBe(false);
    expect(window.location.pathname).toBe("/p1");
  });

  it('"none" 이면 브라우저 forward(popstate)도 전환 없이 바로 반영한다', async () => {
    renderRouter({ popStateTransition: "none" });
    await pushAndSettle("/p2");
    await backAndSettle();

    act(() => {
      window.history.forward();
    });

    expect(await statesWhenDepth(2)).toEqual(["p1:covered", "p2:idle"]);
    expect(router.isTransitioning).toBe(false);
  });

  it('"none" 이어도 push 와 WebViewKit back() 은 슬라이드한다', async () => {
    // popstate 가 전환 끝나기 전에 도착하도록 길게
    renderRouter({ popStateTransition: "none", duration: SLOW_DURATION_MS });

    act(() => {
      router.push("/p2");
    });
    expect(pageStates()).toEqual(["p1:exit", "p2:enter"]);
    await settle();

    act(() => {
      router.back();
    });
    expect(pageStates()).toEqual(["p1:enter", "p2:exit"]);
    // 뒤따르는 popstate 는 no-op 이라 전환을 끊지 않는다
    await waitFor(() => expect(window.location.pathname).toBe("/p1"));
    expect(pageStates()).toEqual(["p1:enter", "p2:exit"]);
    await settle();
    expect(pageStates()).toEqual(["p1:idle"]);
  });
});

describe("전환 안전 타이머", () => {
  const GRACE_MS = TRANSITION_END_GRACE_MS;
  const START_TIMEOUT_MS = TRANSITION_START_TIMEOUT_MS;
  const MARGIN_MS = 5;
  const proto = HTMLElement.prototype as unknown as {
    getAnimations?: () => unknown[];
  };
  const original = proto.getAnimations;

  /** 실제 브라우저처럼 전환 중인 페이지에 시작 대기 애니메이션이 있다고 알린다 */
  const mockPendingAnimation = () => {
    proto.getAnimations = function (this: HTMLElement) {
      const state = this.getAttribute("data-state");
      return state === "enter" || state === "exit" ? [{}] : [];
    };
  };

  const advance = (ms: number) => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (original) proto.getAnimations = original;
    else delete proto.getAnimations;
  });

  it("jsdom 에는 Web Animations API 가 없다 (아래 폴백 테스트 전제)", () => {
    expect(original).toBeUndefined();
  });

  it("animationstart 전에는 커밋 기준 duration+grace 가 지나도 끝나지 않는다", () => {
    mockPendingAnimation();
    renderRouter();

    act(() => {
      router.push("/p2");
    });
    advance(TEST_DURATION_MS + GRACE_MS + MARGIN_MS);

    expect(router.isTransitioning).toBe(true);
    expect(pageStates()).toEqual(["p1:exit", "p2:enter"]);
  });

  it("animationstart 뒤에는 그때부터 duration+grace 에 끝난다", () => {
    mockPendingAnimation();
    renderRouter();
    act(() => {
      router.push("/p2");
    });
    advance(TEST_DURATION_MS + GRACE_MS + MARGIN_MS);

    fireEvent.animationStart(wrapperOf("p2"));
    advance(TEST_DURATION_MS + GRACE_MS - MARGIN_MS);
    expect(router.isTransitioning).toBe(true);

    advance(MARGIN_MS * 2);
    expect(router.isTransitioning).toBe(false);
    expect(pageStates()).toEqual(["p1:covered", "p2:idle"]);
  });

  it("시작 대기 애니메이션이 끝내 시작하지 않으면 duration+시작 대기 시간에 끝낸다", () => {
    mockPendingAnimation();
    renderRouter();
    act(() => {
      router.push("/p2");
    });

    advance(TEST_DURATION_MS + START_TIMEOUT_MS - MARGIN_MS);
    expect(router.isTransitioning).toBe(true);
    advance(MARGIN_MS * 2);
    expect(router.isTransitioning).toBe(false);
  });

  it("애니메이션 이벤트가 없는 환경(jsdom)은 지금처럼 duration+grace 에 끝낸다", () => {
    renderRouter();
    act(() => {
      router.push("/p2");
    });

    advance(TEST_DURATION_MS + GRACE_MS + MARGIN_MS);
    expect(router.isTransitioning).toBe(false);
  });
});
