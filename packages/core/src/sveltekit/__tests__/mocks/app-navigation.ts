import { vi } from "vitest";
import { kit } from "../kit.js";

/** 테스트용 `$app/navigation`. 실제 SvelteKit 처럼 history 를 먼저 바꾸고 onNavigate → page 갱신 순으로 흉내 낸다 */
export const onNavigate = (callback: (navigation: unknown) => void) => {
  kit.callbacks.add(callback);
};

export const goto = vi.fn(
  (url: string, options: { replaceState?: boolean } = {}) =>
    kit.navigate(url, { replace: options.replaceState })
);
