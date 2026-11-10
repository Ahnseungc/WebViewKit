# WebViewKit

[![npm](https://img.shields.io/npm/v/@ahnseungchan/webviewkit)](https://www.npmjs.com/package/@ahnseungchan/webviewkit)
[![CI](https://github.com/Ahnseungc/WebViewKit/actions/workflows/ci.yml/badge.svg)](https://github.com/Ahnseungc/WebViewKit/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue)](https://github.com/Ahnseungc/WebViewKit/blob/main/LICENSE)

**Native-like stack navigation for React apps that run inside a WebView.**

Hybrid apps (React Native WebView, Flutter InAppWebView, or a plain mobile browser) usually feel like a website:
pages swap instantly, back resets scroll, and the hardware back button does odd things.
WebViewKit gives your React pages an iOS-style push/back stack on top of `history.pushState`,
so screens slide in and out like a native app while URLs, browser back, and deep links keep working.

**[Live demo →](https://ahnseungc.github.io/WebViewKit/)** (open it on your phone)

[한국어 문서](https://github.com/Ahnseungc/WebViewKit/blob/main/docs/README.ko.md)

## Features

- **iOS-style transitions**: parallax, dim, and edge shadow (`slide`), or `fade` / `none`. Respects `prefers-reduced-motion`.
- **Real history**: every push is a history entry, so browser back, Android hardware back, and iOS edge swipe all pop the stack.
- **Deep links and refresh**: opening `/detail/3` directly restores `[root, /detail/3]`.
- **keep-alive pages**: opt-in per route. Scroll position, inputs, and component state survive back and re-open.
- **Stack helpers**: `push`, `replace`, `reset`, `resetPush`, `pop(n)`, `popTo(path)`.
- **Per-page header** that slides with its page.
- **Native bridge** for React Native and Flutter: the app can drive the stack, and hardware back asks the web first.
- **Works with Next.js App Router** (history state from the framework is preserved).
- Dev overlay that shows the current stack.

## Install

```bash
npm install @ahnseungchan/webviewkit
# peer: react >= 18
```

## Quick start

```tsx
import { StackRouterProvider, useParams, useStackRouter } from "@ahnseungchan/webviewkit";

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

## Core API

| API | What it does |
|-----|--------------|
| `<StackRouterProvider>` | Owns the stack. Key props: `Activities`, `initialActivity`, `transition` (`"slide"` \| `"fade"` \| `"none"`), `duration`, `keepAliveLimit`, `popStateTransition`, `restoreStack`, `isShowHeader`, `bridge` |
| `useStackRouter()` | `push`, `replace`, `reset`, `resetPush`, `back`, `pop(n)`, `popTo(path)`, `canGoBack`, `depth`, `currentPath`, `isTransitioning` |
| `useOptionalStackRouter()` | Same, but returns `null` outside the provider |
| `useActivity()` | Current page: `path`, `params`, `query`, `data`, `isTop`, `isCached`, ... |
| `useParams()` | Route params (`/detail/:id` → `{ id }`) |
| `useOnRevive(cb)` | Called when a keep-alive page comes back, so you can refresh its data |
| `<StackHeader title />` | Header with a back button, rendered inside the page |

Theme with CSS variables: `--wvk-page-bg`, `--wvk-dim-color`, `--wvk-edge-shadow`, `--wvk-header-bg`, `--wvk-header-border`, `--wvk-header-color`, `--wvk-back-color`.

Full prop and hook reference: [docs/README.ko.md](https://github.com/Ahnseungc/WebViewKit/blob/main/docs/README.ko.md) (Korean for now; an English reference PR is welcome).

## Native bridge

```tsx
// Let the app drive the stack and answer hardware back
<StackRouterProvider bridge {...props} />

// Or connect another router (e.g. Next.js)
<WebViewBridgeProvider stack={{ push, replace, pop, reset }} />
```

- The app sends `stack.push` / `stack.pop` / `back.request` messages. The web replies `{ handled }` so the app knows whether to close.
- Works with `react-native-webview` (`postMessage`) and `flutter_inappwebview` (`callHandler`), including a Flutter bridge that is injected late.
- Only same-origin paths are accepted by default (`javascript:` and external URLs are rejected).

Protocol: [docs/native-bridge-protocol.md](https://github.com/Ahnseungc/WebViewKit/blob/main/docs/native-bridge-protocol.md)

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

Releases: bump `packages/core/package.json` and `CHANGELOG.md`, then push a `v<version>` tag.
`.github/workflows/publish.yml` publishes to npm and creates a GitHub Release.

## License

[MIT](https://github.com/Ahnseungc/WebViewKit/blob/main/LICENSE)
