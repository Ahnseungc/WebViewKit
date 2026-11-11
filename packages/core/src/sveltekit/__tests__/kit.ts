import { tick } from "svelte";
import { page } from "./mocks/app-state.svelte.js";

const ORIGIN = "http://localhost";
const DETAIL = /^\/detail\/(\w+)$/;

type NavigateCallback = (navigation: unknown) => void;

/** url → SvelteKit 이 load 를 마치고 page 에 넣을 값 */
const resolve = (href: string) => {
  const url = new URL(href, ORIGIN);
  const id = DETAIL.exec(url.pathname)?.[1];
  if (id) {
    return {
      url,
      params: { id },
      route: { id: "/detail/[id]" },
      data: { id, renderedOn: "client" },
    };
  }
  return { url, params: {}, route: { id: url.pathname }, data: {} };
};

const writeHistory = (index: number, href: string, replace: boolean) => {
  const state = { "sveltekit:metadata": { historyIndex: index } };
  if (replace) window.history.replaceState(state, "", href);
  else window.history.pushState(state, "", href);
};

/** SvelteKit 클라이언트 라우터 흉내: history 갱신 → onNavigate → page 갱신 */
export const kit = {
  callbacks: new Set<NavigateCallback>(),
  index: 0,
  entries: [] as string[],

  start(href: string, index = 1) {
    kit.callbacks.clear();
    kit.index = index;
    kit.entries = [];
    kit.entries[index] = href;
    writeHistory(index, href, true);
    Object.assign(page, resolve(href), { form: null, error: null });
  },

  async navigate(href: string, { replace = false } = {}) {
    if (!replace) kit.index += 1;
    kit.entries[kit.index] = href;
    kit.entries.length = kit.index + 1;
    writeHistory(kit.index, href, replace);
    kit.callbacks.forEach((callback) => callback({ type: "goto" }));
    Object.assign(page, resolve(href));
    await tick();
  },

  /** 브라우저 back/forward 뒤 popstate 처리 */
  async traverse(delta: number) {
    kit.index += delta;
    const href = kit.entries[kit.index] ?? "/";
    writeHistory(kit.index, href, true);
    kit.callbacks.forEach((callback) => callback({ type: "popstate", delta }));
    Object.assign(page, resolve(href));
    await tick();
  },

  /** invalidate() 처럼 같은 위치에서 data 만 다시 받는다 */
  async reload(data: Record<string, unknown>) {
    page.data = data;
    await tick();
  },
};
