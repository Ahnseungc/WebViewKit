import { BACK_TIMEOUT_MS } from "../constants";
import { history } from "../history";
import { HistoryAction } from "../type";

const nextPopState = () =>
  new Promise<void>((resolve) =>
    window.addEventListener("popstate", () => resolve(), { once: true })
  );

describe("history", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("push 는 state 에 path·action·key·index 를 기록한다", () => {
    history.push("/detail?id=1", { key: "k1", index: 1, data: { a: 1 } });

    expect(window.location.pathname + window.location.search).toBe(
      "/detail?id=1"
    );
    expect(window.history.state).toEqual({
      key: "k1",
      index: 1,
      data: { a: 1 },
      path: "/detail?id=1",
      action: HistoryAction.PUSH,
    });
  });

  it("replace 는 현재 엔트리를 교체한다", () => {
    const length = window.history.length;
    history.replace("/replaced", { key: "k2", index: 0 });

    expect(window.history.length).toBe(length);
    expect(window.history.state.action).toBe(HistoryAction.REPLACE);
  });

  it("push·replace 는 리스너를 호출하지 않는다", () => {
    const listener = jest.fn();
    const remove = history.addListener(listener);

    history.push("/a");
    history.replace("/b");

    expect(listener).not.toHaveBeenCalled();
    remove();
  });

  it("popstate 는 리스너에 POP 으로 한 번만 전달된다", async () => {
    const listener = jest.fn();
    const remove = history.addListener(listener);
    history.push("/a", { key: "a", index: 1 });

    const popped = await history.back();

    expect(popped).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].action).toBe(HistoryAction.POP);
    remove();
  });

  it("같은 리스너를 두 번 등록해도 한 번만 호출된다", async () => {
    const listener = jest.fn();
    const removeA = history.addListener(listener);
    const removeB = history.addListener(listener);
    history.push("/a");

    const popped = nextPopState();
    window.history.back();
    await popped;

    expect(listener).toHaveBeenCalledTimes(1);
    removeA();
    removeB();
  });

  it("해제한 리스너는 더 이상 호출되지 않는다", async () => {
    const listener = jest.fn();
    history.addListener(listener)();
    history.push("/a");

    await history.back();

    expect(listener).not.toHaveBeenCalled();
  });

  it("popstate 가 오지 않으면 BACK_TIMEOUT_MS 뒤 false 로 끝난다", async () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(window.history, "go").mockImplementation(() => {});

    const result = history.back();
    jest.advanceTimersByTime(BACK_TIMEOUT_MS);

    await expect(result).resolves.toBe(false);
    spy.mockRestore();
    jest.useRealTimers();
  });

  it("state 가 없으면 현재 pathname+search 를 반환한다", () => {
    window.history.replaceState(null, "", "/plain?x=1");

    expect(history.getCurrentState()).toEqual({ path: "/plain?x=1" });
  });
});
