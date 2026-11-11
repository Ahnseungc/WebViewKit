import { createRouterStack } from "../stack-router/router-stack";
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
});
