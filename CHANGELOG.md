# Changelog

All notable changes to `@ahnseungchan/webviewkit` are documented here.

## [Unreleased]

### Added

- `StackHeader` 전환: push/back 시 제목이 페이지 방향으로 밀리며 크로스페이드, 루트 진입·복귀 시 back 버튼 페이드. `headerTransition={false}` 로 끔. `title` prop 을 지정하면 제목은 전환하지 않음

## [2.1.0] - 2026-11-04

### Changed

- `transition="slide"` 를 iOS 네이티브 스택 전환에 맞춤: 감속 곡선 `cubic-bezier(0.32, 0.72, 0, 1)`, 아래 페이지 -30% 패럴랙스 + 검은 dim 레이어(투명도 변화 제거), 위 페이지 왼쪽 가장자리 그림자
- `STACK_TRANSITION_MS` 300 → 500
- CSS 변수 `--wvk-dim-color`, `--wvk-edge-shadow` 추가

### Fixed

- back 전환을 popstate 를 기다리지 않고 클릭 즉시 시작 (popstate 가 늦는 WebView 에서 슬라이드 지연)

## [2.0.0] - 2026-11-04

스택 라우터 재구현 · 브릿지 신뢰성 강화 · 배포 정비. 설계: `docs/specs/webviewkit-v2/spec.md`, 근거: `docs/prd/webviewkit-v2-prd.md`.

### Breaking

- `history.push` / `replace` 는 동기 `void` 이며 리스너를 호출하지 않는다 (리스너는 popstate 전용). `history.back()` 은 `Promise<boolean>`
- 브릿지 요청(`request`, `stackPush` 등)은 `Promise<BridgeResult>` (`{ envelope, result }`) 를 반환하고 실패 시 `BridgeError` 로 reject
- `StackRouterBridge.reset(url, meta?)` — meta 전달
- 같은 path 를 다시 `push` 하면 항상 새 엔트리를 쌓는다 (기존 페이지로 돌아가려면 `popTo`)
- `push` / `back` 등은 `boolean` 반환. 전환 중 호출은 무시(`false`)
- `STACK_TRANSITION_MS` 500 → 300 (`duration` prop 으로 조정)
- peer `react` / `react-dom` `>=18`
- ESM + CJS 듀얼 빌드, `exports` 맵

### Added

- 동적 라우트(`/detail/:id`)·쿼리 매칭, `useParams()`, `useActivity()`
- `pop(n)`, `popTo(path)`, `reset(path)`, `canGoBack`, `depth`
- 새로고침·딥링크 복원 (`restoreStack: "with-root" | "top-only"`)
- `onBackAtRoot`, `onNotFound`, `transition: "slide" | "fade" | "none"`, `duration`, `safeArea`, `isShowHeader` 동작
- `prefers-reduced-motion` 대응, 비활성 페이지 `inert`·`aria-hidden`, `BackRouter` `aria-label`
- `<StackRouterProvider bridge>` — native `stack.*`·`back.request` 를 웹 스택에 연결, `stack.changed` 전송
- 브릿지: `BridgeError` 코드(`TIMEOUT` 등), 요청 타임아웃, RN `expectResponse` + `bridge.response` 매칭, `waitForBridgeHost`(Flutter 지연 주입), URL 검증(`isSafeStackUrl`, `allowUrl`), `replyToNative`, `onError`
- PR CI (lint·typecheck·test·build)

### Fixed

- 3단 스택에서 back 시 아래 페이지까지 퇴장 애니메이션이 걸려 빈 화면이 되던 문제
- 전환이 끝나도 애니메이션 상태가 유지되어 다음 push 때 기존 페이지 애니메이션이 재생되던 문제
- 하드웨어·브라우저 back(popstate) 시 URL 만 바뀌고 화면이 그대로던 문제
- 인라인 `initialActivity` 로 리렌더하면 스택이 초기화되던 문제
- 루트에서 back 시 빈 화면이 되던 문제, 딥링크 진입 시 URL·화면 불일치
- 미등록 경로 push 시 URL 만 바뀌던 문제, `replace` 가 화면에 반영되지 않던 문제
- back 한 번에 리스너 2회 호출, popstate 미수신 시 무한 대기
- `javascript:`·외부 URL 이 `window.stackPush` 로 그대로 전달되던 문제
- 핸들러 예외가 unhandled rejection 으로 새던 문제, 인라인 `stack` prop 으로 매 렌더 재설치, 다중 설치 cleanup 이 서로의 전역을 지우던 문제
- 소비자 프로젝트에서 `window.stackPush` 등 전역 타입이 빠지던 문제
- `pnpm lint` 실행 실패, 일부 테스트 파일 미실행

### Removed

- git 에 커밋돼 있던 `node_modules`·`dist`
- `user-select: none`·`cursor: grab` 기본 스타일

### Migration (1.x → 2.0)

```diff
- const env = await getStackRouterBridge()?.push("/detail");
+ const { envelope, result } = (await getStackRouterBridge()?.push("/detail")) ?? {};

- await history.push("/a"); // 리스너가 지연 후 호출됨
+ history.push("/a");       // 리스너 호출 없음. 라우터는 useStackRouter().push 사용
```

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
