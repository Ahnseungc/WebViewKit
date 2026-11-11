/**
 * history 항목마다 고유 key·위치(index)를 `history.state` 에 붙인다.
 * 이동 종류(push·replace·pop)를 알려 주지 않는 라우터(Next App Router 등)용.
 *
 * - `history.pushState`·`replaceState` 를 감싸, 쓰는 state 에 `__wvk: { key, index }` 를 넣고
 *   그 key 가 push 로 생겼는지 replace 로 생겼는지 기록한다
 * - location 이 바뀐 뒤 `takeHistoryWrite(key)` 가 기록이 없으면 그 항목은 back/forward(pop) 로 온 것
 * - 같은 URL 로 replace 하면(라우터의 state 재기록·refresh) 현재 key 를 유지한다
 * - 새로고침해도 브라우저가 history.state 를 보존하므로 key·index 가 남는다 (스택 바닥 아래 back 판별)
 */

const META_FIELD = "__wvk";

export interface HistoryEntryMeta {
  key: string;
  /** 첫 기록 항목 0 기준 상대 위치. push 마다 +1 */
  index: number;
}

export type HistoryWrite = "push" | "replace";

type StateWriter = History["pushState"];

const KEY_RADIX = 36;
const KEY_RANDOM_LENGTH = 8;
let keySequence = 0;

export const createHistoryKey = () =>
  `${(keySequence++).toString(KEY_RADIX)}${Math.random()
    .toString(KEY_RADIX)
    .slice(2, 2 + KEY_RANDOM_LENGTH)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toMeta = (value: unknown): HistoryEntryMeta | undefined => {
  if (!isRecord(value)) return undefined;
  const { key, index } = value;
  return typeof key === "string" && typeof index === "number"
    ? { key, index }
    : undefined;
};

const metaOf = (state: unknown) =>
  isRecord(state) ? toMeta(state[META_FIELD]) : undefined;

/** 현재 history 항목의 key·index. 서버이거나 아직 붙이지 않았으면 undefined */
export const readHistoryEntry = (): HistoryEntryMeta | undefined =>
  typeof window === "undefined" ? undefined : metaOf(window.history.state);

/** 객체 state 에만 붙인다. 문자열 등 다른 state 는 그대로 둔다 */
const withMeta = (data: unknown, meta: HistoryEntryMeta) => {
  if (data !== null && data !== undefined && !isRecord(data)) return data;
  return { ...(data ?? {}), [META_FIELD]: meta };
};

const isSameUrl = (url: string | URL | null | undefined) =>
  url === null ||
  url === undefined ||
  new URL(String(url), window.location.href).href === window.location.href;

// 아직 location 반영(take) 전인 기록. 한 커밋에 한 번 쓰이므로 take 할 때 비운다
const pendingWrites = new Map<string, HistoryWrite>();
let installed = false;

function wrapPushState(original: StateWriter): StateWriter {
  return function pushState(this: History, data, unused, url) {
    const meta = {
      key: createHistoryKey(),
      index: (readHistoryEntry()?.index ?? 0) + 1,
    };
    pendingWrites.set(meta.key, "push");
    return original.call(this, withMeta(data, meta), unused, url);
  };
}

function wrapReplaceState(original: StateWriter): StateWriter {
  return function replaceState(this: History, data, unused, url) {
    const current = readHistoryEntry();
    // 이미 붙어 있으면(라우터가 기존 state 를 이어 쓴 경우) 그대로, 같은 URL 이면 현재 항목 유지
    const kept = metaOf(data) ?? (isSameUrl(url) ? current : undefined);
    if (kept) return original.call(this, withMeta(data, kept), unused, url);
    const meta = { key: createHistoryKey(), index: current?.index ?? 0 };
    pendingWrites.set(meta.key, "replace");
    return original.call(this, withMeta(data, meta), unused, url);
  };
}

/**
 * `history.pushState`·`replaceState` 를 한 번만 감싼다 (되돌리지 않는다. 라우터가 그 위를 다시 감쌀 수 있다).
 * 현재 항목에 key 가 없으면 `fallback` 으로 붙인다. 반환값은 현재 항목
 */
export function installHistoryEntries(
  fallback: HistoryEntryMeta
): HistoryEntryMeta {
  const { history } = window;
  if (!installed) {
    installed = true;
    history.pushState = wrapPushState(history.pushState);
    history.replaceState = wrapReplaceState(history.replaceState);
  }
  const current = readHistoryEntry();
  if (current) return current;
  history.replaceState(withMeta(history.state, fallback), "");
  return fallback;
}

/** 이 key 의 항목이 push·replace 로 생겼으면 그 종류, 아니면(back/forward 로 왔으면) undefined */
export function takeHistoryWrite(key: string): HistoryWrite | undefined {
  const write = pendingWrites.get(key);
  pendingWrites.clear();
  return write;
}
