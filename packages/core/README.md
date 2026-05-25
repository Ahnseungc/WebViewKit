# @ahnseungchan/webviewkit

React WebView·하이브리드 앱용 **스택 네비게이션** 라이브러리입니다.  
`history.pushState` 기반으로 push/back 전환과 CSS 슬라이드 애니메이션을 제공합니다.

## 설치

```bash
npm install @ahnseungchan/webviewkit
# peer: react, react-dom, @emotion/react, @emotion/styled
```

## Quick Start

```tsx
import { StackRouterProvider, useStackRouter } from "@ahnseungchan/webviewkit";

function Home() {
  const { push } = useStackRouter();
  return <button onClick={() => push("/about")}>About</button>;
}

export default function App() {
  return (
    <StackRouterProvider
      maxWidth="600px"
      enableDevTools // 개발 시 스택 로드맵 표시 (기본: development에서 on)
      Activities={[
        { path: "/", element: <Home /> },
        { path: "/about", element: <About /> },
      ]}
      initialActivity={{ path: "/", element: <Home /> }}
    />
  );
}
```

## Dev Stack Roadmap

`enableDevTools` 가 켜지면 화면 우하단에 **스택 깊이·경로 로드맵**(점→선)이 표시됩니다.

- 현재 쌓인 페이지 수
- 경로 목록 (top 표시)
- 시각적 dot roadmap

프로덕션에서는 `enableDevTools={false}` 또는 미설정(기본 off in production)을 권장합니다.

## API

| Export | 설명 |
|--------|------|
| `StackRouterProvider` | 스택 라우터 루트 |
| `useStackRouter` | `push`, `back`, `replace`, `visiblePages` … |
| `history` | `pushState` 래퍼 |
| `BackRouter`, `StackHeader` | UI 보조 |
| `StackDevRoadmap` | 단독 로드맵 UI |
| `STACK_TRANSITION_MS` | 전환 시간 상수 (500) |

## Changelog

### 1.1.0

- Dev **Stack Roadmap** 오버레이 (`enableDevTools`)
- npm `main` → `dist/index.js` 빌드 경로 수정
- 미사용 `gsap` 의존성 제거
- SSR-safe `history` (window 가드)
- 전환 시간 `STACK_TRANSITION_MS` 로 통일

### 1.0.x

- stack-router, history, browser 예제 (2025-05)

## License

MIT
