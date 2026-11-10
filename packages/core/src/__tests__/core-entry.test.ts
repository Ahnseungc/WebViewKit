import {
  createPageLayout,
  createStackNavigator,
  getStackPageAttributes,
  STACK_TRANSITION_MS,
  type StackNavigator,
} from "../core";

const activities = [
  { path: "/detail/:id" },
  { path: "/list", keepAlive: true },
];

const createNavigator = (duration = 0) =>
  createStackNavigator({
    initialActivity: { path: "/" },
    activities,
    duration,
    restoreStack: "with-root",
    keepAliveLimit: 5,
  });

const paths = (navigator: StackNavigator) =>
  navigator.getState().entries.map((entry) => entry.path);

describe("core 진입점 (React 없이)", () => {
  let stop: () => void;

  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    stop?.();
    jest.useRealTimers();
  });

  it("core 모듈 그래프는 react 를 import 하지 않는다", () => {
    jest.isolateModules(() => {
      jest.doMock("react", () => {
        throw new Error("react imported");
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolateModules 안에서 동기 로드
      expect(() => require("../core")).not.toThrow();
    });
  });

  it("push 하면 구독자에게 알리고 params·URL 이 반영된다", () => {
    const navigator = createNavigator();
    stop = navigator.start();
    const listener = jest.fn();
    navigator.subscribe(listener);

    expect(navigator.push("/detail/3?tab=a")).toBe(true);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(paths(navigator)).toEqual(["/", "/detail/3?tab=a"]);
    const top = navigator.getState().entries[1];
    expect([top.params, top.query]).toEqual([{ id: "3" }, { tab: "a" }]);
    expect(window.location.pathname).toBe("/detail/3");
  });

  it("back 은 popstate 전에 스택을 줄인다", () => {
    const navigator = createNavigator();
    stop = navigator.start();
    navigator.push("/detail/1");

    expect(navigator.back()).toBe(true);

    expect(paths(navigator)).toEqual(["/"]);
  });

  it("전환 중에는 잠기고, 안전 타이머가 끝나면 풀린다", () => {
    jest.useFakeTimers();
    const navigator = createNavigator(STACK_TRANSITION_MS);
    stop = navigator.start();

    navigator.push("/detail/1");
    expect(navigator.push("/detail/2")).toBe(false);

    jest.advanceTimersByTime(STACK_TRANSITION_MS * 2);
    expect(navigator.getState().transition).toBeNull();
    expect(navigator.push("/detail/2")).toBe(true);
  });

  it("레이아웃·속성 헬퍼로 바인딩이 그릴 페이지를 얻는다", () => {
    jest.useFakeTimers();
    const navigator = createNavigator(STACK_TRANSITION_MS);
    stop = navigator.start();
    const layout = createPageLayout();

    navigator.push("/detail/1");
    const state = navigator.getState();
    const pages = layout(state);

    expect(pages.map((page) => [page.entry.path, page.pageState])).toEqual([
      ["/", "exit"],
      ["/detail/1", "enter"],
    ]);
    const attributes = getStackPageAttributes(pages[1], {
      direction: "push",
      transition: "slide",
      duration: STACK_TRANSITION_MS,
    });
    expect(attributes).toMatchObject({
      className: "wvk-page",
      "data-state": "enter",
      "data-transition": "slide",
      style: { zIndex: 1, "--wvk-duration": `${STACK_TRANSITION_MS}ms` },
    });
  });
});
