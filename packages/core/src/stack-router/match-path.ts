import type { Activity } from "../type";

export interface PathMatch {
  params: Record<string, string>;
  query: Record<string, string>;
}

const splitSegments = (pathname: string) =>
  pathname.split("/").filter((segment) => segment.length > 0);

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export function parseQuery(search: string): Record<string, string> {
  const query: Record<string, string> = {};
  new URLSearchParams(search).forEach((value, key) => {
    query[key] = value;
  });
  return query;
}

/**
 * `pattern`(`/detail/:id`)과 `url`(`/detail/3?tab=a#x`)을 비교한다.
 * 끝의 `/`와 `#hash`는 무시한다. 불일치면 null.
 */
export function matchPath(pattern: string, url: string): PathMatch | null {
  const [withoutHash] = url.split("#");
  const queryIndex = withoutHash.indexOf("?");
  const pathname =
    queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const search = queryIndex === -1 ? "" : withoutHash.slice(queryIndex);

  const patternSegments = splitSegments(pattern);
  const pathSegments = splitSegments(pathname);
  if (patternSegments.length !== pathSegments.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternSegments.length; i += 1) {
    const expected = patternSegments[i];
    const actual = pathSegments[i];
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = safeDecode(actual);
    } else if (expected !== actual) {
      return null;
    }
  }

  return { params, query: parseQuery(search) };
}

/** 등록 순서대로 첫 매칭 Activity */
export function findActivity(
  activities: Activity[],
  url: string
): { activity: Activity; match: PathMatch } | null {
  for (const activity of activities) {
    const match = matchPath(activity.path, url);
    if (match) return { activity, match };
  }
  return null;
}
