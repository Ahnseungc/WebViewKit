# Changelog

All notable changes to `@ahnseungchan/webviewkit` are documented here.

## [1.3.0] - 2026-05-25

### Added

- **Native Bridge Protocol v1** — JSON envelope (`webviewkit` namespace)
- **`WebViewBridgeProvider`**, **`createWebViewBridgeClient`**, **`installBridgeHost`**
- **`createStackRouterBridge` / `getStackRouterBridge`** — Flutter `stackPush`·`stackPop` 레거시 핸들러 호환
- **React Native** (`ReactNativeWebView.postMessage`) · **Flutter** (`flutter_inappwebview.callHandler`) transport
- 문서: `docs/native-bridge-protocol.md`
- npm README·패키지 설명에서 제품(앱) 특정 도메인 문구 제거

## [1.2.0] - 2026-05-25

### Added

- **`StackDevRoadmap`** — 개발 환경에서 스택 깊이·경로를 점→선 로드맵으로 표시
- **`enableDevTools`** on `StackRouterProvider` (기본: `NODE_ENV === "development"`일 때 활성)
- **`STACK_TRANSITION_MS`** — push/back 애니메이션·history 지연 시간 통일 (500ms)
- 공개 API 정리: `StackRouterProvider`, `useStackRouter`, `history`, `BackRouter`, `StackHeader`, `StackDevRoadmap`

### Fixed

- npm 패키지 `main` / `types`가 실제 `dist/index.js`를 가리키도록 빌드 설정 수정
- SSR·테스트 환경에서 `history`의 `window` 접근 오류 방지
- CSS 전환과 `setTimeout` 타이밍 불일치 완화

### Removed

- 사용하지 않던 **`gsap`** 의존성 (README의 GSAP 설명과 불일치하던 부분 정리)

### Migration (1.0.8 → 1.2.0)

```bash
npm install @ahnseungchan/webviewkit@1.2.0
```

```tsx
<StackRouterProvider enableDevTools={process.env.NODE_ENV === "development"} ... />
```

## [1.1.0] - 2026-05-25 (unpublished)

내부 개발 버전. npm에는 **1.2.0**으로 일괄 배포.

## [1.0.8] - 2025-05-31

- Stack router 구조·테스트
- History API 래퍼
- Browser 예제 패키지

## [1.0.0] - 2025-05-17

- Initial release
