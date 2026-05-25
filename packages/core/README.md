# @ahnseungchan/webviewkit

React **WebView·하이브리드 앱**용 스택(push/back) 네비게이션 라이브러리입니다.  
`history.pushState`와 CSS 슬라이드 전환으로 네이티브 앱에 가까운 화면 이동을 구현합니다.

## 설치

```bash
npm install @ahnseungchan/webviewkit
```

**Peer dependencies** (프로젝트에 직접 설치):

```bash
npm install react react-dom @emotion/react @emotion/styled
```

## Quick Start

```tsx
import { StackRouterProvider, useStackRouter } from "@ahnseungchan/webviewkit";

function Home() {
  const { push } = useStackRouter();
  return <button onClick={() => push("/about")}>About</button>;
}

function About() {
  const { back } = useStackRouter();
  return <button onClick={back}>Back</button>;
}

export default function App() {
  return (
    <StackRouterProvider
      maxWidth="600px"
      enableDevTools
      Activities={[
        { path: "/", element: <Home /> },
        { path: "/about", element: <About /> },
      ]}
      initialActivity={{ path: "/", element: <Home /> }}
    />
  );
}
```

## Dev Stack Roadmap (1.2.0)

개발 모드에서 스택이 몇 장 쌓였는지 **눈으로** 확인할 수 있습니다.

| 옵션 | 동작 |
|------|------|
| `enableDevTools={true}` | 우하단 로드맵 항상 표시 |
| `enableDevTools={false}` | 숨김 |
| 생략 | `development`에서만 표시, production에서는 숨김 |

로드맵에 표시되는 정보:

- **stack × N** — 현재 스택 깊이
- **점→선** — 쌓인 페이지 순서
- **경로 목록** — 각 `path`, 최상단에 `← top`

```tsx
import { StackDevRoadmap } from "@ahnseungchan/webviewkit";

// StackRouterProvider 없이 디버그 UI만 쓸 때
<StackDevRoadmap
  pages={[{ path: "/" }, { path: "/detail" }]}
  currentPath="/detail"
/>
```

## API

| Export | 설명 |
|--------|------|
| `StackRouterProvider` | 스택 라우터 루트 |
| `useStackRouter` | `push`, `back`, `replace`, `forward`, `visiblePages` |
| `history` | `pushState` / `popstate` 래퍼 (SSR-safe) |
| `BackRouter` | 뒤로가기 버튼 |
| `StackHeader` | 경로 표시 헤더 |
| `StackDevRoadmap` | 스택 로드맵 오버레이 |
| `WebViewBridgeProvider` | RN/Flutter 브릿지 (protocol v1) |
| `getStackRouterBridge` | web → native 스택 호출 |
| `STACK_TRANSITION_MS` | 전환 ms 상수 (`500`) |
| `Direction`, `HistoryAction` | 타입·enum |

## Native Bridge (1.3.0)

하이브리드 앱에서 **웹 스택 UI**와 **네이티브(WebView) 스택**을 같은 프로토콜로 맞출 때 사용합니다.  
React Native · Flutter · 브라우저 단독 모두 지원합니다.

```tsx
import { WebViewBridgeProvider, getStackRouterBridge } from "@ahnseungchan/webviewkit";

// native → web: router handlers / web → native: bridge client
<WebViewBridgeProvider stack={{ push, replace, pop, reset }} />;

await getStackRouterBridge()?.push("/detail");
```

- Flutter: `stackPush` / `stackPop` 등 레거시 핸들러 또는 JSON envelope
- React Native: `ReactNativeWebView.postMessage`
- 프로토콜 상세: [docs/native-bridge-protocol.md](../../docs/native-bridge-protocol.md)

## License

MIT
