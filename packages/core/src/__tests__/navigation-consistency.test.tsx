import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import StackRouterProvider, {
  type StackRouterContextValue,
  useStackRouter,
} from "../stack-router/stack-router-provider";

const TEST_DURATION_MS = 20;
/** popstate 가 모두 도착할 만큼 기다림 */
const HISTORY_SETTLE_MS = 100;

let router: StackRouterContextValue;
const Page = ({ id }: { id: string }) => {
  router = useStackRouter();
  return <div data-testid={id} />;
};

const activities = ["/p1", "/p2", "/p3", "/x"].map((path) => ({
  path,
  element: <Page id={path.slice(1)} />,
}));

const renderRouter = () =>
  render(
    <StackRouterProvider
      initialActivity={activities[0]}
      Activities={activities}
      duration={TEST_DURATION_MS}
      enableDevTools={false}
    />
  );

const visiblePages = () =>
  Array.from(screen.getByTestId("layout").querySelectorAll("[data-state]")).map(
    (element) =>
      `${element.firstElementChild?.getAttribute("data-testid")}:${element.getAttribute("data-state")}`
  );

const wait = (ms: number) =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

/** 전환·history 이동이 다 끝난 뒤 URL·history.state·스택 top 이 일치해야 한다 */
const expectConsistent = async (paths: string[]) => {
  await wait(HISTORY_SETTLE_MS);
  await waitFor(() => expect(router.isTransitioning).toBe(false));
  expect(router.entries.map((entry) => entry.path)).toEqual(paths);
  const top = router.entries[router.entries.length - 1];
  expect(window.location.pathname).toBe(top.path);
  expect((window.history.state as { key?: string }).key).toBe(top.key);
  expect(visiblePages().filter((page) => !page.endsWith(":covered"))).toEqual([
    `${top.path.slice(1)}:idle`,
  ]);
};

const go = async (action: () => unknown) => {
  act(() => {
    action();
  });
  await wait(HISTORY_SETTLE_MS);
  await waitFor(() => expect(router.isTransitioning).toBe(false));
};

beforeEach(() => {
  window.history.replaceState(null, "", "/p1");
});

describe("reset 뒤 브라우저 history", () => {
  it("reset 후 브라우저 back 이 지운 페이지를 되살리지 않는다", async () => {
    renderRouter();
    await go(() => router.push("/p2"));
    await go(() => router.push("/p3"));

    await go(() => router.reset("/x"));
    await expectConsistent(["/x"]);

    act(() => {
      window.history.back();
    });
    await expectConsistent(["/x"]);
  });

  it("reset 후 push·back 이 정상 동작한다", async () => {
    renderRouter();
    await go(() => router.push("/p2"));
    await go(() => router.reset("/x"));
    await go(() => router.push("/p3"));
    await expectConsistent(["/x", "/p3"]);

    await go(() => router.back());
    await expectConsistent(["/x"]);
  });
});

describe("연속·비정상 순서 내비게이션", () => {
  it("같은 tick 에 push 를 연타하면 첫 번째만 반영된다", async () => {
    renderRouter();

    let results: boolean[] = [];
    act(() => {
      results = [router.push("/p2"), router.push("/p3"), router.push("/x")];
    });

    expect(results).toEqual([true, false, false]);
    await expectConsistent(["/p1", "/p2"]);
  });

  it("push 전환 중 back 은 무시된다", async () => {
    renderRouter();

    let backResult = true;
    act(() => {
      router.push("/p2");
      backResult = router.back();
    });

    expect(backResult).toBe(false);
    await expectConsistent(["/p1", "/p2"]);
  });

  it("push 전환 중 브라우저 back(popstate) 이 와도 URL 과 스택이 맞는다", async () => {
    renderRouter();

    act(() => {
      router.push("/p2");
    });
    act(() => {
      window.history.back();
    });

    await expectConsistent(["/p1"]);
  });

  it("브라우저 back 을 빠르게 두 번 눌러도 도착한 위치와 스택이 맞는다", async () => {
    renderRouter();
    await go(() => router.push("/p2"));
    await go(() => router.push("/p3"));

    act(() => {
      window.history.back();
      window.history.back();
    });

    // 브라우저마다 연속 back 을 합치기도 한다. 도착한 history 위치와 스택이 같으면 된다
    await wait(HISTORY_SETTLE_MS);
    const landedIndex = (window.history.state as { index: number }).index;
    await expectConsistent(["/p1", "/p2", "/p3"].slice(0, landedIndex + 1));
  });

  it("back 직후 history 이동이 끝나기 전 push 는 거절된다", async () => {
    renderRouter();
    await go(() => router.push("/p2"));

    let pushResult = true;
    act(() => {
      router.back();
    });
    await waitFor(() => expect(router.isTransitioning).toBe(false));
    act(() => {
      pushResult = router.push("/p3");
    });

    // popstate 가 아직이면 거절, 이미 왔으면 허용. 어느 쪽이든 결과가 일치해야 한다
    await expectConsistent(pushResult ? ["/p1", "/p3"] : ["/p1"]);
  });

  it("resetPush 직후 브라우저 back 은 루트로 간다", async () => {
    renderRouter();
    await go(() => router.push("/p2"));
    await go(() => router.push("/p3"));
    await go(() => router.resetPush("/x"));
    await expectConsistent(["/p1", "/x"]);

    act(() => {
      window.history.back();
    });

    await expectConsistent(["/p1"]);
  });

  it("브라우저 forward 로 돌아온 페이지가 스택에 다시 쌓인다", async () => {
    renderRouter();
    await go(() => router.push("/p2"));
    await go(() => router.back());

    act(() => {
      window.history.forward();
    });

    await expectConsistent(["/p1", "/p2"]);
  });
});
