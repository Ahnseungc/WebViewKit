import type { Component } from "svelte";

/**
 * SvelteKit 이 history.state 에 남기는 history 위치 (내부 값).
 * Kit 3: `sveltekit:metadata.historyIndex`, Kit 2: `sveltekit:history`. 서버·없으면 undefined
 */
export function readHistoryIndex(): number | undefined {
  if (typeof window === "undefined") return undefined;
  const state = window.history.state as Record<string, unknown> | null;
  const metadata = state?.["sveltekit:metadata"] as
    | { historyIndex?: unknown }
    | undefined;
  const index = metadata?.historyIndex ?? state?.["sveltekit:history"];
  return typeof index === "number" ? index : undefined;
}

// `./detail/[id]/+page.svelte`(루트 +layout 기준 상대) · `/src/routes/detail/[id]/+page.svelte` → `/detail/[id]`
const PAGE_FILE = /^(?:\.|\/src\/routes)(\/.*?)\/?\+page\.svelte$/;

/**
 * `import.meta.glob("./**\/+page.svelte", { eager: true })` 결과 → route id 별 페이지 컴포넌트.
 * 값은 모듈(`{ default }`)이나 컴포넌트(`import: "default"`) 둘 다 받는다
 */
export function toPageComponents(
  modules: Record<string, unknown>
): Map<string, Component<any>> {
  const components = new Map<string, Component<any>>();
  for (const [file, value] of Object.entries(modules)) {
    const routeId = PAGE_FILE.exec(file)?.[1];
    const component =
      typeof value === "function"
        ? value
        : (value as { default?: unknown } | null)?.default;
    if (routeId && typeof component === "function") {
      components.set(routeId, component as Component<any>);
    }
  }
  return components;
}
