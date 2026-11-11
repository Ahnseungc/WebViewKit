# webview-kit

[![npm](https://img.shields.io/npm/v/@ahnseungchan/webviewkit)](https://www.npmjs.com/package/@ahnseungchan/webviewkit)
[![CI](https://github.com/Ahnseungc/webview-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/Ahnseungc/webview-kit/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/Ahnseungc/webview-kit/blob/main/LICENSE)

**Native-like stack navigation for web apps that run inside a WebView. Works with React, Vue, Svelte, or plain JavaScript.**

<p align="center">
  <a href="https://ahnseungc.github.io/webview-kit/"><img src="https://raw.githubusercontent.com/Ahnseungc/webview-kit/main/docs/assets/demo.gif" width="300" alt="webview-kit demo: pages slide in on push and slide out on back, with the stack shown in a devtools overlay" /></a>
</p>

<p align="center">
  <b><a href="https://ahnseungc.github.io/webview-kit/">Live demo →</a></b> (open it on your phone)
</p>

## Why

A web app inside a WebView usually feels like a website. webview-kit makes it feel like the native screens around it.

| In a plain WebView                                   | With webview-kit                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Pages swap instantly                                 | Pages slide in and out like iOS screens                            |
| Going back loses scroll position and form input      | `keepAlive` pages keep scroll, inputs, and state                   |
| Android hardware back closes the app or does nothing | Back pops the web stack first, and the app closes only at the root |
| A deep link to `/detail/3` has nothing to go back to | Deep links restore the stack: `[root, /detail/3]`                  |

It sits on top of `history.pushState`, so URLs, browser back, and refresh keep working.
Works in React Native WebView, Flutter InAppWebView, or a plain mobile browser.

[한국어 문서](https://github.com/Ahnseungc/webview-kit/blob/main/docs/README.ko.md)

## Features

- **iOS-style transitions**: parallax, dim, and edge shadow (`slide`), or `fade` / `none`. Respects `prefers-reduced-motion`.
- **Real history**: every push is a history entry, so browser back, Android hardware back, and iOS edge swipe all pop the stack.
- **Deep links and refresh**: opening `/detail/3` directly restores `[root, /detail/3]`.
- **keep-alive pages**: opt-in per route. Scroll position, inputs, and component state survive back and re-open.
- **Stack helpers**: `push`, `replace`, `reset`, `resetPush`, `pop(n)`, `popTo(path)`.
- **Per-page header** that slides with its page.
- **Native bridge** for React Native and Flutter: the app can drive the stack, and hardware back asks the web first.
- **Any framework**: one framework-agnostic core, with React, Vue 3, and Svelte 5 bindings that behave the same.
- **Server rendering with your framework's router**: Next.js App Router, React Router 7, Nuxt / Vue Router, and SvelteKit adapters keep the framework in charge of URLs, data, and SSR, and add the stack on top.
- No CSS-in-JS runtime: the transition CSS is a single static stylesheet.

## Install

```bash
npm install @ahnseungchan/webviewkit
```

| Import                                  | For                   | Peer dependency         |
| --------------------------------------- | --------------------- | ----------------------- |
| `@ahnseungchan/webviewkit`              | React                 | `react` >= 18           |
| `@ahnseungchan/webviewkit/vue`          | Vue 3                 | `vue` >= 3.3            |
| `@ahnseungchan/webviewkit/svelte`       | Svelte 5              | `svelte` >= 5           |
| `@ahnseungchan/webviewkit/core`         | Anything else         | none                    |
| `@ahnseungchan/webviewkit/next`         | Next.js App Router    | `next` >= 16            |
| `@ahnseungchan/webviewkit/react-router` | React Router 7        | `react-router` >= 7     |
| `@ahnseungchan/webviewkit/vue-router`   | Vue Router 4+, Nuxt 4 | `vue-router` >= 4.1     |
| `@ahnseungchan/webviewkit/sveltekit`    | SvelteKit             | `@sveltejs/kit` >= 2.12 |

Each peer is optional: install only the one you use.

## Quick start

### React

```tsx
import {
  StackRouterProvider,
  useParams,
  useStackRouter,
} from "@ahnseungchan/webviewkit";

function Home() {
  const { push } = useStackRouter();
  return <button onClick={() => push("/detail/1")}>Open detail</button>;
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const { back } = useStackRouter();
  return <button onClick={back}>Back from {id}</button>;
}

export default function App() {
  return (
    <StackRouterProvider
      initialActivity={{ path: "/", element: <Home /> }}
      Activities={[
        { path: "/", element: <Home /> },
        { path: "/detail/:id", element: <Detail />, keepAlive: true },
      ]}
      onBackAtRoot={() => window.close()}
    />
  );
}
```

<details>
<summary><b>Vue 3</b></summary>

```ts
import { createApp, defineComponent, h } from "vue";
import {
  StackRouter,
  useParams,
  useStackRouter,
} from "@ahnseungchan/webviewkit/vue";

const Home = defineComponent(() => {
  const router = useStackRouter(); // reactive: router.depth, router.canGoBack, router.push(...)
  return () =>
    h("button", { onClick: () => router.push("/detail/1") }, "Open detail");
});

const Detail = defineComponent(() => {
  const params = useParams<{ id: string }>(); // ComputedRef
  return () => h("p", `Detail ${params.value.id}`);
});

createApp(() =>
  h(StackRouter, {
    initialActivity: { path: "/", component: Home },
    activities: [{ path: "/detail/:id", component: Detail, keepAlive: true }],
    isShowHeader: true,
  })
).mount("#app");
```

</details>

<details>
<summary><b>Svelte 5</b></summary>

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { StackRouter } from "@ahnseungchan/webviewkit/svelte";
  import Detail from "./Detail.svelte";
  import Home from "./Home.svelte";
</script>

<StackRouter
  initialActivity={{ path: "/", component: Home }}
  activities={[{ path: "/detail/:id", component: Detail, keepAlive: true }]}
  isShowHeader
/>
```

```svelte
<!-- Detail.svelte -->
<script lang="ts">
  import { useParams, useStackRouter } from "@ahnseungchan/webviewkit/svelte";
  const router = useStackRouter(); // getters: router.depth, router.canGoBack
  const params = useParams<{ id: string }>(); // params.current.id
</script>

<button onclick={() => router.back()}>Back from {params.current.id}</button>
```

Svelte components ship as `.svelte` source and are compiled by your app's Svelte plugin (runes, Svelte 5 only).

</details>

## Use your framework's router (SSR)

`StackRouterProvider` owns history itself, so with SSR only the first page you open is rendered on the server.
If your app already has a router, use an adapter instead: the framework keeps URLs, data loading, and SSR, and webview-kit stacks the pages it renders.

- Opening `/detail/2` directly renders that page on the server, inside the stack markup, with the stack CSS inlined (styled first paint).
- Every push runs the framework's own data loading (Next RSC request, React Router loader, SvelteKit `load`, Nuxt `useFetch`).
- Pages underneath keep the params, URL, and data they were opened with while new pages slide over them.
- Back/forward animate in the right direction, including after a refresh. `keepAlive` pages keep their state.
- Navigate with the framework's links and router. `useStack()` adds `depth`, `canGoBack`, `isTransitioning`, `push`, `replace`, `reset`, `back`, `pop(n)`.
- Shared props: `transition`, `duration`, `popStateTransition`, `maxWidth`, `maxMountedPages`, `safeArea`, `keepAlive`, `keepAliveLimit`, `onBackAtRoot`, `bridge`.

<details>
<summary><b>Next.js App Router</b></summary>

```tsx
// app/stack.tsx
"use client";
import { StackLayout } from "@ahnseungchan/webviewkit/next";

export default function Stack({ children }: { children: React.ReactNode }) {
  return (
    <StackLayout keepAlive={(path) => path === "/form"}>{children}</StackLayout>
  );
}

// app/layout.tsx
<body>
  <Stack>{children}</Stack>
</body>;
```

Server components re-run on every push. Covered pages keep their `useParams()` / `usePathname()` through Next's internal router contexts, which may change between Next releases (verified on 16.4).

</details>

<details>
<summary><b>React Router 7 (framework or data mode)</b></summary>

```tsx
// app/routes/stack.tsx, a layout route around your pages
import { StackOutlet } from "@ahnseungchan/webviewkit/react-router";

export default function StackLayout() {
  return <StackOutlet keepAlive={(path) => path === "/form"} />;
}
```

Covered pages keep their location and loader data through React Router's `UNSAFE_LocationContext` and `UNSAFE_DataRouterStateContext`.

</details>

<details>
<summary><b>Nuxt / Vue Router</b></summary>

```vue
<!-- app.vue -->
<template>
  <StackRouterView v-slot="{ route }">
    <NuxtPage :route="route" />
  </StackRouterView>
</template>
```

With plain Vue Router, use `<StackRouterView />` where `<RouterView />` was. Mark keep-alive pages with `definePageMeta({ keepAlive: true })` (or route `meta.keepAlive`). New pages slide in after their async data resolves.
Nuxt fetches data from the client on navigation; only direct visits and refreshes render on the server.

</details>

<details>
<summary><b>SvelteKit</b></summary>

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { StackLayout } from "@ahnseungchan/webviewkit/sveltekit";
  let { children } = $props();
  const pages = import.meta.glob("./**/+page.svelte", { eager: true });
</script>

<StackLayout {pages}>{@render children()}</StackLayout>
```

SvelteKit only renders the current page, so the adapter mounts page components from `pages` itself.
Read page values with `useStackPage()` or the `data` prop (`$app/state` `page` always shows the current URL).
Limits: no per-route code splitting (eager glob), and nested `+layout.svelte` files below this layout are not rendered.

</details>

## API

Every binding exposes the same pieces. Names below are the React ones.

| API                        | What it does                                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<StackRouterProvider>`    | Owns the stack. Key props: `Activities`, `initialActivity`, `transition` (`"slide"` \| `"fade"` \| `"none"`), `duration`, `keepAliveLimit`, `popStateTransition`, `restoreStack`, `isShowHeader`, `bridge` |
| `useStackRouter()`         | `push`, `replace`, `reset`, `resetPush`, `back`, `pop(n)`, `popTo(path)`, `canGoBack`, `depth`, `currentPath`, `isTransitioning`                                                                           |
| `useOptionalStackRouter()` | Same, but returns `null` outside the provider                                                                                                                                                              |
| `useActivity()`            | Current page: `path`, `params`, `query`, `data`, `isTop`, `isCached`, ...                                                                                                                                  |
| `useParams()`              | Route params (`/detail/:id` → `{ id }`)                                                                                                                                                                    |
| `useOnRevive(cb)`          | Called when a keep-alive page comes back, so you can refresh its data                                                                                                                                      |
| `<StackHeader title />`    | Header with a back button, rendered inside the page                                                                                                                                                        |

Differences in Vue and Svelte:

| React                    | Vue 3                          | Svelte 5                  |
| ------------------------ | ------------------------------ | ------------------------- |
| `<StackRouterProvider>`  | `StackRouter`                  | `StackRouter`             |
| `Activities`, `element`  | `activities`, `component`      | `activities`, `component` |
| `useActivity()` value    | `Ref` (`activity.value`)       | `{ current }`             |
| `useParams()` value      | `ComputedRef` (`params.value`) | `{ current }`             |
| `enableDevTools` overlay | not yet                        | not yet                   |

Theme with CSS variables: `--wvk-page-bg`, `--wvk-dim-color`, `--wvk-edge-shadow`, `--wvk-header-bg`, `--wvk-header-border`, `--wvk-header-color`, `--wvk-back-color`.

Full prop and hook reference: [docs/README.ko.md](https://github.com/Ahnseungc/webview-kit/blob/main/docs/README.ko.md) (Korean for now; an English reference PR is welcome).

## Other frameworks (`/core`)

`@ahnseungchan/webviewkit/core` holds everything except rendering: the stack navigator, history sync, keep-alive, transition timing, CSS, and the native bridge. It never imports a UI framework.
A binding only subscribes to the navigator and draws the pages it is given. The Vue and Svelte bindings are built this way.

```ts
import {
  createPageLayout,
  createStackNavigator,
  ensureStackStyles,
  getStackPageAttributes,
} from "@ahnseungchan/webviewkit/core";

const navigator = createStackNavigator({
  initialActivity: { path: "/" },
  activities: [{ path: "/detail/:id", keepAlive: true }],
  duration: 500,
  restoreStack: "with-root",
  keepAliveLimit: 5,
});
const layout = createPageLayout();

ensureStackStyles();
const stop = navigator.start(); // popstate + deep-link restore; call stop() on unmount
navigator.subscribe(() => {
  const state = navigator.getState();
  for (const page of layout(state)) {
    // Render one element per page.entry.key (skip its content when !page.mounted) and spread:
    getStackPageAttributes(page, {
      direction: state.transition?.type ?? "push",
      transition: "slide",
      duration: 500,
    });
  }
});
```

On the entering page (`pageState === "enter"`), call `navigator.onTransitionStart()` on `animationstart` and `navigator.endTransition()` on `animationend` (filter with `isOwnPageAnimation(event)`). Set `inert` on pages that are not on top.
`connectStackBridge(navigator, options)` wires the native bridge the same way the `bridge` prop does.

The React bindings and router adapters render the stylesheet inline, so server-rendered HTML is styled on first paint. With a custom binding, put `stackStyles` in a `<style data-webviewkit>` tag yourself.
For a framework router, use `createRouterStack` (call `sync()` on each location change) with `createRouterStackActions` and `connectRouterStackBridge`, as the adapters above do.

## Native bridge

```tsx
// Let the app drive the stack and answer hardware back (same prop in Vue and Svelte)
<StackRouterProvider bridge {...props} />

// Or connect another router (e.g. Next.js)
<WebViewBridgeProvider stack={{ push, replace, pop, reset }} />
```

- The app sends `stack.push` / `stack.pop` / `back.request` messages. The web replies `{ handled }` so the app knows whether to close.
- Works with `react-native-webview` (`postMessage`) and `flutter_inappwebview` (`callHandler`), including a Flutter bridge that is injected late.
- Only same-origin paths are accepted by default (`javascript:` and external URLs are rejected).
- The bridge client (`createWebViewBridgeClient`, `installBridgeHost`, ...) is also exported from `/core` for apps without a UI framework.

Protocol: [docs/native-bridge-protocol.md](https://github.com/Ahnseungc/webview-kit/blob/main/docs/native-bridge-protocol.md)

### iOS edge swipe tip

If your React Native WebView uses `allowsBackForwardNavigationGestures`, WKWebView already animates the swipe.
Set `popStateTransition="none"` on iOS so the page does not slide twice.

## Contributing

Issues and PRs are welcome. Bug reports with a repro, docs and translations, and demo improvements all help.

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm --filter @webviewkit/browser dev   # demo at http://localhost:3000
```

`pnpm test` runs jest (core, React, Vue) and vitest (Svelte). `pnpm typecheck` runs `tsc` and `svelte-check`.

Releases: bump `packages/core/package.json` and `CHANGELOG.md`, then push a `v<version>` tag.
`.github/workflows/publish.yml` publishes to npm and creates a GitHub Release.

## License

[MIT](https://github.com/Ahnseungc/webview-kit/blob/main/LICENSE)
