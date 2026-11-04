import { findActivity, matchPath } from "../stack-router/match-path";

describe("matchPath", () => {
  it("정적 경로가 일치하면 빈 params", () => {
    expect(matchPath("/about", "/about")).toEqual({ params: {}, query: {} });
  });

  it("동적 세그먼트를 디코드해 params 로 반환한다", () => {
    expect(matchPath("/detail/:id", "/detail/a%20b")?.params).toEqual({
      id: "a b",
    });
  });

  it("쿼리를 분리하고 hash 는 무시한다", () => {
    expect(matchPath("/list", "/list?tab=new&page=2#top")).toEqual({
      params: {},
      query: { tab: "new", page: "2" },
    });
  });

  it("끝의 / 를 무시한다", () => {
    expect(matchPath("/about/", "/about")).not.toBeNull();
  });

  it("세그먼트 수가 다르면 null", () => {
    expect(matchPath("/detail/:id", "/detail")).toBeNull();
  });

  it("정적 세그먼트가 다르면 null", () => {
    expect(matchPath("/a/:id", "/b/1")).toBeNull();
  });
});

describe("findActivity", () => {
  const activities = [
    { path: "/detail/new", element: null },
    { path: "/detail/:id", element: null },
  ];

  it("등록 순서대로 첫 매칭을 고른다", () => {
    expect(findActivity(activities, "/detail/new")?.activity.path).toBe(
      "/detail/new"
    );
  });

  it("매칭이 없으면 null", () => {
    expect(findActivity(activities, "/nope")).toBeNull();
  });
});
