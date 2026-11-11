import { createRouterStack } from "../stack-router/router-stack";
import { createRouterStackActions } from "../stack-router/router-stack-actions";
import { getRenderedPages } from "../stack-router/stack-reducer";

const states = (stack: ReturnType<typeof createRouterStack>) =>
  getRenderedPages(stack.getState()).map(
    ({ entry, pageState }) => `${entry.key}:${pageState}`
  );

const createStack = (index?: number) =>
  createRouterStack({ key: "a", path: "/a", index }, { duration: 300 });

describe("createRouterStack", () => {
  afterEach(() => jest.useRealTimers());

  it("push 는 새 페이지를 enter, 이전 페이지를 exit 으로 둔다", () => {
    const stack = createStack();
    stack.sync({ key: "b", path: "/b", action: "push" });

    expect(states(stack)).toEqual(["a:exit", "b:enter"]);
  });

  it("스택 안 key 로 pop 하면 그 위 페이지들이 나간다", () => {
    const stack = createStack();
    stack.sync({ key: "b", path: "/b", action: "push" });
    stack.endTransition();
    stack.sync({ key: "c", path: "/c", action: "push" });
    stack.endTransition();
    stack.sync({ key: "a", path: "/a", action: "pop" });

    expect(states(stack)).toEqual(["a:enter", "b:exit", "c:exit"]);
    stack.endTransition();
    expect(states(stack)).toEqual(["a:idle"]);
  });

  it("스택 밖 key 로 pop 하면 앞으로 가기로 쌓는다", () => {
    const stack = createStack();
    stack.sync({ key: "b", path: "/b", action: "pop" });

    expect(states(stack)).toEqual(["a:exit", "b:enter"]);
  });

  it("스택 바닥보다 앞 history 로 pop 하면 새 바닥이 pop 방향으로 들어온다", () => {
    const stack = createStack(3);
    stack.sync({ key: "z", path: "/z", action: "pop", index: 2 });

    expect(states(stack)).toEqual(["z:enter", "a:exit"]);
    stack.endTransition();
    expect(states(stack)).toEqual(["z:idle"]);
  });

  it("replace 는 애니메이션 없이 top 만 바꾼다", () => {
    const stack = createStack();
    stack.sync({ key: "b", path: "/b", action: "replace" });

    expect(states(stack)).toEqual(["b:idle"]);
  });

  it("같은 key 는 무시한다", () => {
    const stack = createStack();
    const listener = jest.fn();
    stack.subscribe(listener);
    stack.sync({ key: "a", path: "/a", action: "pop" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("animationend 가 없어도 안전 타이머로 전환을 끝낸다", () => {
    jest.useFakeTimers();
    const stack = createStack();
    stack.sync({ key: "b", path: "/b", action: "push" });
    jest.runAllTimers();

    expect(states(stack)).toEqual(["a:covered", "b:idle"]);
  });

  it("duration 0 이면 즉시 전환한다", () => {
    const stack = createRouterStack({ key: "a", path: "/a" }, { duration: 0 });
    stack.sync({ key: "b", path: "/b", action: "push" });

    expect(states(stack)).toEqual(["a:covered", "b:idle"]);
  });

  it("keepAlive 페이지는 나간 뒤 같은 path 로 push 하면 예전 엔트리 key 로 되살아난다", () => {
    const stack = createRouterStack(
      { key: "a", path: "/a" },
      { duration: 0, keepAliveLimit: 3 }
    );
    stack.sync({ key: "b", path: "/b", action: "push", keepAlive: true });
    stack.sync({ key: "a", path: "/a", action: "pop" });
    expect(states(stack)).toEqual(["b:cached", "a:idle"]);

    stack.sync({ key: "b2", path: "/b", action: "push", keepAlive: true });

    expect(stack.entryKeyFor("b2")).toBe("b");
    expect(states(stack)).toEqual(["a:covered", "b:idle"]);
    expect(stack.getState().entries[1].revision).toBe(1);
  });

  it("되살린 페이지의 새 location key 로 돌아와도 같은 엔트리로 pop 한다", () => {
    const stack = createRouterStack(
      { key: "a", path: "/a" },
      { duration: 0, keepAliveLimit: 3 }
    );
    stack.sync({ key: "b", path: "/b", action: "push", keepAlive: true });
    stack.sync({ key: "a", path: "/a", action: "pop" });
    stack.sync({ key: "b2", path: "/b", action: "push", keepAlive: true });
    stack.sync({ key: "c", path: "/c", action: "push" });
    stack.sync({ key: "b2", path: "/b", action: "pop" });

    expect(states(stack)).toEqual(["a:covered", "b:idle"]);
  });

  it("퇴장 애니메이션 중인 keepAlive 페이지로 다시 push 해도 그 인스턴스를 되살린다", () => {
    const stack = createRouterStack(
      { key: "a", path: "/a" },
      { duration: 300, keepAliveLimit: 3 }
    );
    stack.sync({ key: "b", path: "/b", action: "push", keepAlive: true });
    stack.endTransition();
    stack.sync({ key: "a", path: "/a", action: "pop" });
    expect(states(stack)).toEqual(["a:enter", "b:exit"]);

    stack.sync({ key: "b2", path: "/b", action: "push", keepAlive: true });

    expect(stack.entryKeyFor("b2")).toBe("b");
    expect(states(stack)).toEqual(["a:exit", "b:enter"]);
  });

  it("expectReset 뒤 sync 는 스택을 새 엔트리 하나로 비운다", () => {
    const stack = createRouterStack({ key: "a", path: "/a" }, { duration: 0 });
    stack.sync({ key: "b", path: "/b", action: "push" });
    stack.expectReset();
    stack.sync({ key: "c", path: "/c", action: "replace" });

    expect(states(stack)).toEqual(["c:idle"]);
  });
});

describe("createRouterStackActions", () => {
  const setup = () => {
    const stack = createRouterStack({ key: "a", path: "/a" }, { duration: 0 });
    const driver = { navigate: jest.fn(), go: jest.fn() };
    const onBackAtRoot = jest.fn();
    const actions = createRouterStackActions(stack, driver, { onBackAtRoot });
    return { stack, driver, onBackAtRoot, actions };
  };

  it("루트에서 back 하면 라우터를 건드리지 않고 onBackAtRoot 를 부른다", () => {
    const { driver, onBackAtRoot, actions } = setup();

    expect(actions.back()).toBe(false);
    expect(driver.go).not.toHaveBeenCalled();
    expect(onBackAtRoot).toHaveBeenCalledTimes(1);
  });

  it("pop(n) 은 스택 깊이 안으로 잘라 history 를 되돌린다", () => {
    const { stack, driver, actions } = setup();
    stack.sync({ key: "b", path: "/b", action: "push" });
    stack.sync({ key: "c", path: "/c", action: "push" });

    expect(actions.pop(5)).toBe(true);
    expect(driver.go).toHaveBeenCalledWith(-2);
  });

  it("reset 은 replace 로 이동하고 다음 sync 를 초기화로 표시한다", () => {
    const { stack, driver, actions } = setup();
    stack.sync({ key: "b", path: "/b", action: "push" });
    actions.reset("/home");
    stack.sync({ key: "h", path: "/home", action: "replace" });

    expect(driver.navigate).toHaveBeenCalledWith("/home", { replace: true });
    expect(states(stack)).toEqual(["h:idle"]);
  });
});
