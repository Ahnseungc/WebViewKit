---
name: webviewkit-library
description: >-
  @ahnseungchan/webviewkit 패키지 개발: StackRouterProvider, history, StackDevRoadmap,
  STACK_TRANSITION_MS, monorepo build. Use when editing packages/core or stack navigation in WebView apps.
---

# WebViewKit Library

## 구조

```
packages/core/src/
  index.ts              # public exports
  history.ts            # pushState wrapper (SSR-safe)
  constants.ts          # STACK_TRANSITION_MS
  stack-router/         # StackRouterProvider, BackRouter, Header
  stack-dev/            # StackDevRoadmap overlay
```

## 사용 예

```tsx
import { StackRouterProvider, useStackRouter } from "@ahnseungchan/webviewkit";

<StackRouterProvider
  enableDevTools
  initialActivity={{ path: "/", element: <Home /> }}
  Activities={[{ path: "/about", element: <About /> }]}
/>
```

## 개발 시 스택 로드맵

- `enableDevTools={true}` 또는 `NODE_ENV === "development"`
- 우하단: depth, dot roadmap, path list

## 빌드·테스트

```bash
cd packages/core
pnpm test
pnpm run build
```

## 금지

- 미사용 heavy deps (예: gsap) 추가
- `src/**/__tests__` 외 중복 테스트 트리 확장
- `noEmit: true` on build tsconfig
