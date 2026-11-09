import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React, { useState } from "react";
import { useActivity, useOnRevive } from "../stack-router/activity-context";
import StackRouterProvider, {
  type StackRouterContextValue,
  useStackRouter,
} from "../stack-router/stack-router-provider";

const TEST_DURATION_MS = 20;
/** popstate 가 모두 도착할 만큼 기다림 */
const HISTORY_SETTLE_MS = 100;

let router: StackRouterContextValue;
let lastActivity: ReturnType<typeof useActivity>;
let lastIsCached: boolean;
const onRevive = jest.fn();

const Plain = ({ id }: { id: string }) => {
  router = useStackRouter();
  return <div data-testid={id} />;
};

/** 클릭 횟수를 state 로 갖는 페이지. 인스턴스가 유지되면 횟수도 유지된다 */
const Counter = ({ id }: { id: string }) => {
  router = useStackRouter();
  const activity = useActivity();
  if (activity.isTop) lastActivity = activity;
  if (id === "list") lastIsCached = activity.isCached;
  useOnRevive((data) => onRevive(data));
  const [count, setCount] = useState(0);
  return (
    <div data-testid={id}>
      <button data-testid={`inc-${id}`} onClick={() => setCount(count + 1)} />
      <span data-testid={`count-${id}`}>{count}</span>
    </div>
  );
};

const activities = [
  { path: "/p1", element: <Plain id="p1" /> },
  { path: "/list", element: <Counter id="list" />, keepAlive: true },
  { path: "/plain", element: <Counter id="plain" /> },
  {
    path: "/detail/:id",
    element: <Counter id="detail" />,
    keepAlive: true,
  },
];

const renderRouter = (keepAliveLimit?: number) =>
  render(
    <StackRouterProvider
      initialActivity={activities[0]}
      Activities={activities}
      duration={TEST_DURATION_MS}
      enableDevTools={false}
      keepAliveLimit={keepAliveLimit}
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
  expect(
    visiblePages().filter((page) => !page.endsWith(":covered"))
  ).toContainEqual(`${top.path.split("/")[1]}:idle`);
};

const go = async (action: () => unknown) => {
  act(() => {
    action();
  });
  await wait(HISTORY_SETTLE_MS);
  await waitFor(() => expect(router.isTransitioning).toBe(false));
};

const click = (id: string, times: number) => {
  for (let i = 0; i < times; i += 1) {
    fireEvent.click(screen.getByTestId(`inc-${id}`));
  }
};

const count = (id: string) => screen.getByTestId(`count-${id}`).textContent;

beforeEach(() => {
  onRevive.mockClear();
  window.history.replaceState(null, "", "/p1");
});

describe("keepAlive 되살리기", () => {
  it("keepAlive 페이지는 back 후 다시 push 하면 state 가 유지된다", async () => {
    renderRouter();
    await go(() => router.push("/list"));
    const firstKey = lastActivity.key;
    click("list", 3);

    await go(() => router.back());
    await go(() => router.push("/list"));

    expect(count("list")).toBe("3");
    expect(lastActivity.key).toBe(firstKey);
    await expectConsistent(["/p1", "/list"]);
  });

  it("keepAlive 아닌 페이지는 새로 마운트된다", async () => {
    renderRouter();
    await go(() => router.push("/plain"));
    click("plain", 3);

    await go(() => router.back());
    await go(() => router.push("/plain"));

    expect(count("plain")).toBe("0");
    await expectConsistent(["/p1", "/plain"]);
  });

  it("params 가 다르면 되살리지 않는다", async () => {
    renderRouter();
    await go(() => router.push("/detail/1"));
    click("detail", 2);
    await go(() => router.back());

    await go(() => router.push("/detail/2"));

    // /detail/1 은 보관된 채 남고, /detail/2 는 새로 마운트된다
    expect(
      screen.getAllByTestId("count-detail").map((el) => el.textContent)
    ).toEqual(["2", "0"]);
    await expectConsistent(["/p1", "/detail/2"]);
  });

  it("되살린 페이지에 새 data 가 반영된다", async () => {
    renderRouter();
    await go(() => router.push("/list", { v: 1 }));
    const firstKey = lastActivity.key;
    await go(() => router.back());

    await go(() => router.push("/list", { v: 2 }));

    expect(lastActivity.key).toBe(firstKey);
    expect(lastActivity.data).toEqual({ v: 2 });
    expect((window.history.state as { data: unknown }).data).toEqual({ v: 2 });
    await expectConsistent(["/p1", "/list"]);
  });

  it("resetPush 대상이 지워질 스택 안 keepAlive 면 그 인스턴스를 되살린다", async () => {
    renderRouter();
    await go(() => router.push("/list"));
    click("list", 2);
    await go(() => router.push("/plain"));

    await go(() => router.resetPush("/list"));

    expect(count("list")).toBe("2");
    await expectConsistent(["/p1", "/list"]);
  });

  it("reset 으로 지워진 keepAlive 페이지도 다음 push 에서 되살아난다", async () => {
    renderRouter();
    await go(() => router.push("/list"));
    click("list", 4);

    await go(() => router.reset("/plain"));
    await go(() => router.push("/list"));

    expect(count("list")).toBe("4");
    await expectConsistent(["/plain", "/list"]);
  });

  it("브라우저 forward 로 보관 key 에 닿으면 push 로 되살아난다", async () => {
    renderRouter();
    await go(() => router.push("/list"));
    click("list", 2);
    await go(() => router.back());

    await go(() => window.history.forward());

    expect(count("list")).toBe("2");
    await expectConsistent(["/p1", "/list"]);
  });

  it("브라우저 back 이 보관 key 에 닿으면 pop 으로 되살아난다", async () => {
    renderRouter();
    await go(() => router.push("/list"));
    const listKey = lastActivity.key;
    click("list", 2);
    await go(() => router.back());
    await go(() => router.push("/plain"));
    const plainKey = lastActivity.key;
    // 스택 top 은 /plain 인데 history 의 이전 항목이 보관된 /list 를 가리키게 한다
    window.history.replaceState(
      { key: listKey, index: 1, path: "/list" },
      "",
      "/list"
    );
    window.history.pushState(
      { key: plainKey, index: 2, path: "/plain" },
      "",
      "/plain"
    );

    await go(() => window.history.back());

    expect(count("list")).toBe("2");
    await expectConsistent(["/p1", "/list"]);
  });

  it("스택 아래에 같은 keepAlive path 가 있으면 push 는 새 엔트리를 만든다", async () => {
    renderRouter();
    await go(() => router.push("/list"));
    click("list", 2);
    await go(() => router.push("/plain"));

    await go(() => router.push("/list"));

    const counts = screen
      .getAllByTestId("count-list")
      .map((element) => element.textContent);
    expect(counts).toEqual(["2", "0"]);
    await expectConsistent(["/p1", "/list", "/plain", "/list"]);
  });

  it("보관에서 쫓겨난 key 로 forward 하면 새로 마운트된다", async () => {
    renderRouter(1);
    await go(() => router.push("/detail/1"));
    await go(() => router.push("/list"));
    click("list", 3);
    await go(() => router.back());

    await go(() => window.history.forward());

    expect(count("list")).toBe("0");
    await expectConsistent(["/p1", "/detail/1", "/list"]);
  });

  it("keepAliveLimit 0 이면 되살리지 않는다", async () => {
    renderRouter(0);
    await go(() => router.push("/list"));
    click("list", 3);
    await go(() => router.back());

    await go(() => router.push("/list"));

    expect(count("list")).toBe("0");
    await expectConsistent(["/p1", "/list"]);
  });
});

describe("보관 페이지 렌더", () => {
  it("보관 중 페이지는 cached 상태이고 inert·aria-hidden 이다", async () => {
    renderRouter();
    await go(() => router.push("/list"));
    await go(() => router.back());

    const wrapper = screen.getByTestId("list").parentElement as HTMLElement;
    expect(wrapper.getAttribute("data-state")).toBe("cached");
    expect(wrapper.hasAttribute("inert")).toBe(true);
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
    expect(getComputedStyle(wrapper).visibility).toBe("hidden");
  });

  it("보관 중 isCached 가 true, 되살아나면 false", async () => {
    renderRouter();
    await go(() => router.push("/list"));
    expect(lastIsCached).toBe(false);
    await go(() => router.back());
    expect(lastIsCached).toBe(true);

    await go(() => router.push("/list"));

    expect(lastIsCached).toBe(false);
  });

  it("useOnRevive 는 되살아날 때 새 data 로 한 번 호출된다", async () => {
    renderRouter();
    await go(() => router.push("/list", { v: 1 }));
    expect(onRevive).not.toHaveBeenCalled();
    await go(() => router.back());
    expect(onRevive).not.toHaveBeenCalled();

    await go(() => router.push("/list", { v: 2 }));

    expect(onRevive).toHaveBeenCalledTimes(1);
    expect(onRevive).toHaveBeenCalledWith({ v: 2 });
  });

  it("keepAliveLimit 0 이면 cached 페이지를 렌더하지 않는다", async () => {
    renderRouter(0);
    await go(() => router.push("/list"));
    await go(() => router.back());

    expect(screen.queryByTestId("list")).toBeNull();
  });
});
