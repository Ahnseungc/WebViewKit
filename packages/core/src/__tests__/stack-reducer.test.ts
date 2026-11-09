import {
  createStackState,
  findRevivable,
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

  it("전환 중 PUSH 가 와도 퇴장 중인 keepAlive 엔트리를 보관한다", () => {
    let state = push(createStackState(entry("a"), 2), kept("b"));
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: true });
    state = stackReducer(state, {
      type: "PUSH",
      entry: entry("d"),
      animate: false,
    });

    expect(keys(state.cached)).toEqual(["b"]);
  });

  it("전환 중 RESET 이 와도 퇴장 중인 keepAlive 엔트리를 보관한다", () => {
    let state = push(createStackState(entry("a"), 2), kept("b"));
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: true });
    state = stackReducer(state, { type: "RESET", entry: entry("z") });

    expect(keys(state.cached)).toEqual(["b"]);
  });

  it("전환 중 두 번째 애니메이션 POP_TO 도 먼저 퇴장한 엔트리를 보관한다", () => {
    let state = createStackState(entry("a"), 3);
    state = push(state, entry("b"));
    state = push(state, kept("c"));
    state = push(state, entry("d"));
    state = stackReducer(state, { type: "POP_TO", index: 2, animate: true });
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: true });

    expect(keys(state.cached)).toEqual([]);
    state = stackReducer(state, { type: "END_TRANSITION" });

    expect(keys(state.cached)).toEqual(["c"]);
  });
});

describe("keep-alive 되살리기", () => {
  const push = (state: ReturnType<typeof createStackState>, e: StackEntry) =>
    stackReducer(state, { type: "PUSH", entry: e, animate: false });
  const cachedState = () => {
    let state = push(createStackState(entry("a"), 3), kept("b"));
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: false });
    return state;
  };

  it("REVIVE push 는 cached 엔트리를 같은 key 로 top 에 올린다", () => {
    const state = stackReducer(cachedState(), {
      type: "REVIVE",
      entry: kept("b"),
      direction: "push",
      index: 1,
      animate: true,
    });

    expect(states(state)).toEqual(["a:exit", "b:enter"]);
    expect(state.cached).toEqual([]);
    expect(state.entries[1].key).toBe("b");
  });

  it("REVIVE pop 은 아래를 자르고 pop 전환으로 되살린다", () => {
    let state = createStackState(entry("a"), 3);
    state = push(state, kept("b"));
    state = push(state, entry("c"));
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: false });
    state = push(state, entry("c"));
    state = push(state, entry("d"));
    state = stackReducer(state, {
      type: "REVIVE",
      entry: kept("b"),
      direction: "pop",
      index: 1,
      animate: true,
    });

    expect(keys(state.entries)).toEqual(["a", "b"]);
    expect(states(state)).toContain("b:enter");
    expect(states(state)).toContain("d:exit");
    expect(state.cached).toEqual([]);
  });

  it("REVIVE 는 전환 중에도 퇴장 중인 keepAlive 를 잃지 않고 되살린 key 는 cached 에 남기지 않는다", () => {
    let state = createStackState(entry("a"), 3);
    state = push(state, kept("b"));
    state = push(state, kept("c"));
    state = stackReducer(state, { type: "POP_TO", index: 0, animate: true });
    state = stackReducer(state, {
      type: "REVIVE",
      entry: kept("b"),
      direction: "push",
      index: 1,
      animate: true,
    });

    expect(keys(state.cached)).toEqual(["c"]);
    expect(keys(state.entries)).toEqual(["a", "b"]);
  });

  it("REVIVE animate=false 는 전환 없이 잘린 엔트리를 즉시 보관한다", () => {
    let state = createStackState(entry("a"), 3);
    state = push(state, kept("b"));
    state = push(state, kept("c"));
    state = stackReducer(state, {
      type: "REVIVE",
      entry: kept("z"),
      direction: "pop",
      index: 1,
      animate: false,
    });

    expect(state.transition).toBeNull();
    expect(keys(state.cached)).toEqual(["b", "c"]);
  });

  it("RESET_PUSH 가 지워질 스택 안의 keepAlive 엔트리를 재사용한다", () => {
    let state = createStackState(entry("a"), 3);
    state = push(state, kept("b"));
    state = push(state, entry("c"));
    state = stackReducer(state, {
      type: "RESET_PUSH",
      entry: kept("b"),
      animate: true,
    });

    expect(keys(state.entries)).toEqual(["a", "b"]);
    expect(keys(state.cached)).toEqual([]);
    expect(states(state)).toContain("c:exit");
  });

  it("RESET_PUSH 가 cached 의 엔트리를 재사용하면 cached 에서 뺀다", () => {
    const state = stackReducer(cachedState(), {
      type: "RESET_PUSH",
      entry: kept("b"),
      animate: true,
    });

    expect(keys(state.entries)).toEqual(["a", "b"]);
    expect(state.cached).toEqual([]);
  });

  it("RESET_PUSH 대상이 현재 top 이면 전환이 없다", () => {
    let state = createStackState(entry("a"), 3);
    state = push(state, kept("b"));
    state = stackReducer(state, {
      type: "RESET_PUSH",
      entry: kept("b"),
      animate: true,
    });

    expect(state.transition).toBeNull();
    expect(state.leaving).toEqual([]);
    expect(keys(state.entries)).toEqual(["a", "b"]);
    expect(state.cached).toEqual([]);
  });

  it("REPLACE·RESET 은 대상 path 의 보관본을 버린다", () => {
    const fresh = { ...kept("b"), key: "b2" };
    const replaced = stackReducer(cachedState(), {
      type: "REPLACE",
      entry: fresh,
    });
    expect(keys(replaced.entries)).toEqual(["b2"]);
    expect(replaced.cached).toEqual([]);

    const reset = stackReducer(cachedState(), { type: "RESET", entry: fresh });
    expect(keys(reset.entries)).toEqual(["b2"]);
    expect(reset.cached).toEqual([]);
  });

  it("REPLACE 로 지워지는 top 이 대상과 같은 path 면 보관하지 않는다", () => {
    let state = push(createStackState(entry("a"), 3), kept("b"));
    state = stackReducer(state, {
      type: "REPLACE",
      entry: { ...kept("b"), key: "b2" },
    });

    expect(keys(state.entries)).toEqual(["a", "b2"]);
    expect(state.cached).toEqual([]);
  });

  it("REVIVE 는 되살린 엔트리의 revision 을 올린다", () => {
    let state = stackReducer(cachedState(), {
      type: "REVIVE",
      entry: kept("b"),
      direction: "push",
      index: 1,
      animate: false,
    });
    expect(state.entries[1].revision).toBe(1);

    state = stackReducer(state, { type: "POP_TO", index: 0, animate: false });
    state = stackReducer(state, {
      type: "REVIVE",
      entry: state.cached[0],
      direction: "push",
      index: 1,
      animate: false,
    });
    expect(state.entries[1].revision).toBe(2);
  });

  it("RESET_PUSH 가 기존 엔트리를 재사용하면 revision 을 올리고, 새 엔트리면 올리지 않는다", () => {
    let state = createStackState(entry("a"), 3);
    state = push(state, kept("b"));
    state = push(state, entry("c"));
    const reused = stackReducer(state, {
      type: "RESET_PUSH",
      entry: kept("b"),
      animate: false,
    });
    expect(reused.entries[1].revision).toBe(1);

    const fresh = stackReducer(state, {
      type: "RESET_PUSH",
      entry: entry("d"),
      animate: false,
    });
    expect(fresh.entries[1].revision).toBeUndefined();
  });

  it("findRevivable 은 includeRemovable 일 때 스택 안 keepAlive 를 cached 보다 먼저 찾는다", () => {
    let state = createStackState(entry("a"), 3);
    state = push(state, kept("b"));
    const inStack = { ...kept("b"), key: "stack-b" };
    state = push(state, inStack);
    state = { ...state, cached: [{ ...kept("b"), key: "cached-b" }] };

    expect(findRevivable(state, "/b")?.key).toBe("cached-b");
    expect(findRevivable(state, "/b", { includeRemovable: true })?.key).toBe(
      "stack-b"
    );
    expect(findRevivable(state, "/zzz")).toBeUndefined();
  });
});
