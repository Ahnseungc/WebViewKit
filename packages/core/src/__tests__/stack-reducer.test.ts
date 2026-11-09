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

const kept = (key: string): StackEntry => ({ ...entry(key), keepAlive: true });

const keys = (list: StackEntry[]) => list.map((e) => e.key);

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

describe("keep-alive 보관", () => {
  const push = (state: ReturnType<typeof createStackState>, e: StackEntry) =>
    stackReducer(state, { type: "PUSH", entry: e, animate: false });

  it("END_TRANSITION 뒤 pop 된 keepAlive 엔트리가 cached 로 간다", () => {
    let state = createStackState(entry("a"), 2);
    state = stackReducer(state, {
      type: "PUSH",
      entry: kept("b"),
      animate: true,
    });
    state = stackReducer(state, { type: "END_TRANSITION" });
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: true });
    state = stackReducer(state, { type: "END_TRANSITION" });

    expect(keys(state.cached)).toEqual(["b"]);
    expect(states(state)).toEqual(["b:cached", "a:idle"]);
    expect(getRenderedPages(state)[0].isTop).toBe(false);
  });

  it("keepAlive 아닌 엔트리는 보관하지 않는다", () => {
    let state = push(createStackState(entry("a"), 2), entry("b"));
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: false });

    expect(state.cached).toEqual([]);
  });

  it("animate=false POP_TO 는 즉시 보관한다", () => {
    let state = push(createStackState(entry("a"), 2), kept("b"));
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: false });

    expect(keys(state.cached)).toEqual(["b"]);
  });

  it("REPLACE 로 지워진 keepAlive 엔트리도 보관한다", () => {
    let state = push(createStackState(entry("a"), 2), kept("b"));
    state = stackReducer(state, { type: "REPLACE", entry: entry("c") });

    expect(keys(state.cached)).toEqual(["b"]);
  });

  it("RESET 으로 지워진 keepAlive 엔트리도 보관한다", () => {
    let state = push(createStackState(kept("a"), 2), kept("b"));
    state = stackReducer(state, { type: "RESET", entry: entry("z") });

    expect(keys(state.cached)).toEqual(["a", "b"]);
    expect(state.cacheLimit).toBe(2);
  });

  it("RESET_PUSH animate=false 로 지워진 keepAlive 엔트리도 보관한다", () => {
    let state = createStackState(entry("a"), 3);
    state = push(state, kept("b"));
    state = push(state, kept("c"));
    state = stackReducer(state, {
      type: "RESET_PUSH",
      entry: entry("z"),
      animate: false,
    });

    expect(keys(state.cached)).toEqual(["b", "c"]);
  });

  it("RESET_PUSH animate 는 중간 엔트리는 즉시, 이전 top 은 END 뒤 보관한다", () => {
    let state = createStackState(entry("a"), 3);
    state = push(state, kept("b"));
    state = push(state, kept("c"));
    state = stackReducer(state, {
      type: "RESET_PUSH",
      entry: entry("z"),
      animate: true,
    });

    expect(keys(state.cached)).toEqual(["b"]);

    state = stackReducer(state, { type: "END_TRANSITION" });

    expect(keys(state.cached)).toEqual(["b", "c"]);
  });

  it("같은 path 가 다시 보관되면 오래된 쪽을 버린다", () => {
    const first = { ...kept("b1"), path: "/b" };
    const second = { ...kept("b2"), path: "/b" };
    let state = createStackState(entry("a"), 2);
    state = push(state, first);
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: false });
    state = push(state, second);
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: false });

    expect(keys(state.cached)).toEqual(["b2"]);
  });

  it("상한을 넘으면 가장 오래된 보관부터 버린다", () => {
    let state = createStackState(entry("a"), 2);
    for (const k of ["c", "d", "e"]) {
      state = push(state, kept(k));
      state = stackReducer(state, { type: "POP_TO", index: 0, animate: false });
    }

    expect(keys(state.cached)).toEqual(["d", "e"]);
  });

  it("스택 안 keepAlive 엔트리도 상한에 포함한다", () => {
    let state = createStackState(kept("x"), 2);
    for (const k of ["c", "d"]) {
      state = push(state, kept(k));
      state = stackReducer(state, { type: "POP_TO", index: 0, animate: false });
    }

    expect(keys(state.cached)).toEqual(["d"]);
  });

  it("cacheLimit 0 이면 보관하지 않는다", () => {
    let state = push(createStackState(entry("a")), kept("b"));
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: false });

    expect(state.cacheLimit).toBe(0);
    expect(state.cached).toEqual([]);
  });
});
