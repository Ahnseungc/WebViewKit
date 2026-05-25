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
| `STACK_TRANSITION_MS` | 전환 ms 상수 (`500`) |
| `Direction`, `HistoryAction` | 타입·enum |

## 골디 앱 연동 참고

B2C WebView에서는 앱 브릿지(`stackRouterBridge`)와 함께 쓰는 경우가 많습니다.  
이 패키지는 **웹 단독 스택 UI**이며, RN 브릿지와는 별도 레이어입니다.

## License

MIT
