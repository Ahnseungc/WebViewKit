import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import React, { useEffect, useState } from "react";
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
/** 페이지 id → 마지막으로 렌더된 useActivity().index */
const indexes: Record<string, number> = {};
/** 페이지 id → 마운트(effect) 횟수 */
const mounts: Record<string, number> = {};

const useMountCount = (id: string) => {
  useEffect(() => {
    mounts[id] = (mounts[id] ?? 0) + 1;
  }, [id]);
};

const Plain = ({ id }: { id: string }) => {
  router = useStackRouter();
  indexes[id] = useActivity().index;
  useMountCount(id);
  return <div data-testid={id} />;
};

/** 클릭 횟수를 state 로 갖는 페이지. 인스턴스가 유지되면 횟수도 유지된다 */
const Counter = ({ id }: { id: string }) => {
  router = useStackRouter();
  const activity = useActivity();
  if (activity.isTop) lastActivity = activity;
  if (id === "list") lastIsCached = activity.isCached;
  indexes[id] = activity.index;
  useMountCount(id);
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
  { path: "/n1", element: <Counter id="n1" /> },
  { path: "/n2", element: <Counter id="n2" /> },
  { path: "/n3", element: <Counter id="n3" /> },
];

const renderRouter = (
  keepAliveLimit?: number,
  maxMountedPages?: number,
  isShowHeader = false
) =>
  render(
    <StackRouterProvider
      initialActivity={activities[0]}
      Activities={activities}
      duration={TEST_DURATION_MS}
      enableDevTools={false}
      keepAliveLimit={keepAliveLimit}
      maxMountedPages={maxMountedPages}
      isShowHeader={isShowHeader}
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
  for (const key of Object.keys(mounts)) delete mounts[key];
  window.history.replaceState(null, "", "/p1");
});

describe("keepAlive 되살리기", () => {
  it("되살린 keepAlive 페이지는 DOM 위치·노드·scrollTop 이 유지된다", async () => {
    renderRouter();
    await go(() => router.push("/list"));
    const layout = screen.getByTestId("layout");
    const wrappers = () => Array.from(layout.querySelectorAll("[data-state]"));
    const listWrapper = screen.getByTestId("list").parentElement as HTMLElement;
    const indexBefore = wrappers().indexOf(listWrapper);
    listWrapper.scrollTop = 234;

    await go(() => router.back());
    // 보관 중에도 DOM 형제 순서가 바뀌지 않아야 한다 (이동 시 scrollTop 초기화)
    expect(wrappers().indexOf(listWrapper)).toBe(indexBefore);

    await go(() => router.push("/list"));

    const revived = screen.getByTestId("list").parentElement as HTMLElement;
    expect(revived).toBe(listWrapper);
    expect(wrappers().indexOf(revived)).toBe(indexBefore);
    expect(revived.scrollTop).toBe(234);
  });

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

describe("useActivity().index", () => {
  const backButtonIn = (id: string) =>
    within(screen.getByTestId(id).parentElement as HTMLElement).queryByRole(
      "button",
      { name: "뒤로 가기", hidden: true }
    );

  it("보관 페이지가 있어도 루트의 index 는 0 이고 back 버튼이 없다", async () => {
    renderRouter(undefined, undefined, true);
    await go(() => router.push("/list"));
    await go(() => router.back());

    expect(indexes.p1).toBe(0);
    expect(backButtonIn("p1")).toBeNull();
  });

  it("스택 페이지의 index 는 보관 페이지 수와 무관하게 스택 위치다", async () => {
    renderRouter(undefined, undefined, true);
    await go(() => router.push("/list"));
    await go(() => router.back());
    await go(() => router.push("/plain"));

    expect(indexes.p1).toBe(0);
    expect(indexes.plain).toBe(1);
    expect(indexes.list).toBe(-1);
  });

  it("pop 으로 퇴장하는 페이지는 슬라이드 동안 back 버튼을 유지한다", async () => {
    renderRouter(undefined, undefined, true);
    await go(() => router.push("/list"));
    await go(() => router.back());
    await go(() => router.push("/plain"));

    act(() => {
      router.back();
    });

    const plainWrapper = screen.getByTestId("plain").parentElement;
    expect(plainWrapper?.getAttribute("data-state")).toBe("exit");
    expect(indexes.plain).toBe(1);
    expect(backButtonIn("plain")).not.toBeNull();
    expect(backButtonIn("p1")).toBeNull();
    await wait(HISTORY_SETTLE_MS);
  });
});

describe("maxMountedPages", () => {
  const pushDeep = async () => {
    await go(() => router.push("/n1"));
    await go(() => router.push("/n2"));
    await go(() => router.push("/n3"));
  };

  it("깊이 4 에서 상한 2 면 아래쪽 일반 페이지는 언마운트된다", async () => {
    renderRouter(undefined, 2);
    await pushDeep();

    expect(screen.queryByTestId("p1")).toBeNull();
    expect(screen.queryByTestId("n1")).toBeNull();
    expect(screen.getByTestId("n2")).toBeTruthy();
    expect(screen.getByTestId("n3")).toBeTruthy();
  });

  it("back 으로 돌아오면 새로 마운트된다", async () => {
    renderRouter(undefined, 2);
    await go(() => router.push("/n1"));
    click("n1", 2);
    await go(() => router.push("/n2"));
    await go(() => router.push("/n3"));
    expect(screen.queryByTestId("n1")).toBeNull();

    await go(() => router.back());
    await go(() => router.back());

    expect(count("n1")).toBe("0");
  });

  it("keepAlive 페이지는 상한 밖이어도 마운트를 유지한다", async () => {
    renderRouter(undefined, 1);
    await go(() => router.push("/list"));
    click("list", 2);
    await go(() => router.push("/n1"));
    await go(() => router.push("/n2"));

    expect(count("list")).toBe("2");
    expect(screen.queryByTestId("p1")).toBeNull();
  });

  it("값이 1 미만이어도 top 은 마운트된다", async () => {
    renderRouter(undefined, 0);
    await go(() => router.push("/n1"));

    expect(screen.getByTestId("n1")).toBeTruthy();
  });

  describe("개발 경고", () => {
    const originalEnv = process.env.NODE_ENV;
    const DEEP_PAGE_COUNT = 16;
    const deepActivities = Array.from({ length: DEEP_PAGE_COUNT }, (_, i) => ({
      path: `/d${i}`,
      element: <Plain id={`d${i}`} />,
    }));
    let warn: jest.SpyInstance;

    beforeEach(() => {
      warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      (process.env as Record<string, string>).NODE_ENV = "development";
    });

    afterEach(() => {
      (process.env as Record<string, string>).NODE_ENV = originalEnv ?? "test";
      warn.mockRestore();
    });

    it("마운트 수가 15 를 넘으면 한 번 경고한다", async () => {
      render(
        <StackRouterProvider
          initialActivity={deepActivities[0]}
          Activities={deepActivities}
          duration={TEST_DURATION_MS}
          enableDevTools={false}
        />
      );
      for (let i = 1; i < DEEP_PAGE_COUNT; i += 1) {
        await go(() => router.push(`/d${i}`));
      }

      const calls = warn.mock.calls.filter((args) =>
        String(args[0]).includes("[webviewkit]")
      );
      expect(calls).toHaveLength(1);
    });
  });
});
