import {
  createStackState,
  getRenderedPages,
  type StackEntry,
  stackReducer,
} from "../stack-router/stack-reducer";

const entry = (key: string): StackEntry => ({
  key,
  path: `/${key}`,
  pattern: `/${key}`,
  params: {},
  query: {},
});

const states = (state: ReturnType<typeof createStackState>) =>
  getRenderedPages(state).map(
    ({ entry: e, pageState }) => `${e.key}:${pageState}`
  );

describe("stackReducer", () => {
  it("PUSH 는 새 top 을 enter, 이전 top 을 exit 으로 둔다", () => {
    const state = stackReducer(createStackState(entry("a")), {
      type: "PUSH",
      entry: entry("b"),
      animate: true,
    });

    expect(states(state)).toEqual(["a:exit", "b:enter"]);
  });

  it("3단에서 POP_TO 는 top 만 exit, 새 top 만 enter (E-01)", () => {
    let state = createStackState(entry("a"));
    state = stackReducer(state, {
      type: "PUSH",
      entry: entry("b"),
      animate: false,
    });
    state = stackReducer(state, {
      type: "PUSH",
      entry: entry("c"),
      animate: false,
    });
    state = stackReducer(state, { type: "POP_TO", index: 1, animate: true });

    expect(states(state)).toEqual(["a:covered", "b:enter", "c:exit"]);
  });

  it("END_TRANSITION 후 top 만 idle, 나머지는 covered (E-02)", () => {
    let state = createStackState(entry("a"));
    state = stackReducer(state, {
      type: "PUSH",
      entry: entry("b"),
      animate: true,
    });
    state = stackReducer(state, { type: "END_TRANSITION" });

    expect(states(state)).toEqual(["a:covered", "b:idle"]);
  });

  it("POP_TO 애니메이션이 끝나면 leaving 엔트리가 제거된다", () => {
    let state = createStackState(entry("a"));
    state = stackReducer(state, {
      type: "PUSH",
      entry: entry("b"),
      animate: false,
    });
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: true });
    state = stackReducer(state, { type: "END_TRANSITION" });

    expect(states(state)).toEqual(["a:idle"]);
  });

  it("top 이상 index 의 POP_TO 는 상태를 바꾸지 않는다", () => {
    const initial = createStackState(entry("a"));

    expect(
      stackReducer(initial, { type: "POP_TO", index: 0, animate: true })
    ).toBe(initial);
  });

  it("REPLACE 는 top 만 교체한다", () => {
    let state = createStackState(entry("a"));
    state = stackReducer(state, {
      type: "PUSH",
      entry: entry("b"),
      animate: false,
    });
    state = stackReducer(state, { type: "REPLACE", entry: entry("c") });

    expect(state.entries.map((e) => e.key)).toEqual(["a", "c"]);
  });

  it("RESET 은 한 장만 남긴다", () => {
    let state = createStackState(entry("a"));
    state = stackReducer(state, {
      type: "PUSH",
      entry: entry("b"),
      animate: false,
    });
    state = stackReducer(state, { type: "RESET", entry: entry("z") });

    expect(state.entries.map((e) => e.key)).toEqual(["z"]);
  });
});
