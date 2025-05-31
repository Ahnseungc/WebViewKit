import { history } from "../history";
import { HistoryState } from "../type";

// mocking window.history
const mockHistory = {
  state: null as HistoryState | null,
  pushState: jest.fn(),
  replaceState: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  go: jest.fn(),
};

// mocking window.location
const mockLocation = {
  pathname: "/",
};

// mocking global window
Object.defineProperty(window, "history", {
  value: mockHistory,
  writable: true,
});

Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

describe("history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistory.state = null;
    mockLocation.pathname = "/";
  });

  describe("push", () => {
    it("should push new history entry", () => {
      const path = "/test";
      const data = { title: "Test" };
      history.push(path, data);

      expect(mockHistory.pushState).toHaveBeenCalledWith(
        { path, data, action: "PUSH" },
        "",
        path
      );
    });
  });

  describe("replace", () => {
    it("should replace current history entry", () => {
      const path = "/test";
      const data = { title: "Test" };
      history.replace(path, data);

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        { path, data, action: "REPLACE" },
        "",
        path
      );
    });
  });

  describe("navigation methods", () => {
    it("should call history.back()", () => {
      history.back();
      expect(mockHistory.back).toHaveBeenCalled();
    });
    it("should call history.forward()", () => {
      history.forward();
      expect(mockHistory.forward).toHaveBeenCalled();
    });

    it("should call history.go()", () => {
      const delta = 2;
      history.go(delta);
      expect(mockHistory.go).toHaveBeenCalledWith(delta);
    });
  });

  describe("getCurrentState", () => {
    it("should return current state", () => {
      const mockState: HistoryState = {
        path: "/test",
        data: { title: "Test" },
      };

      mockHistory.state = mockState;

      const state = history.getCurrentState();
      expect(state).toEqual(mockState);
    });

    it("should return default state when history.state is null", () => {
      mockHistory.state = null;
      mockLocation.pathname = "/default";

      const state = history.getCurrentState();

      expect(state).toEqual({ path: "/default" });
    });
  });

  describe("addListener", () => {
    it("should add and remove listener", () => {
      const listener = jest.fn();

      const removeListener = history.addListener(listener);

      const testState: HistoryState = {
        path: "/test",
      };
      const popStateEvent = new PopStateEvent("popstate", {
        state: testState,
      });
      window.dispatchEvent(popStateEvent);
      expect(listener).toHaveBeenCalledWith(testState);

      // Delete listener
      removeListener();

      // change state and dispatch event
      const newState: HistoryState = { path: "/new" };
      const newPopStateEvent = new PopStateEvent("popstate", {
        state: newState,
      });
      window.dispatchEvent(newPopStateEvent);

      // listener should not be called anymore
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should not add duplicate listener", () => {
      const listener = jest.fn();

      // add listener twice
      history.addListener(listener);
      history.addListener(listener);

      // change state and dispatch event
      const testState: HistoryState = { path: "/test" };
      const popStateEvent = new PopStateEvent("popstate", { state: testState });
      window.dispatchEvent(popStateEvent);

      // listener should be called only once
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
