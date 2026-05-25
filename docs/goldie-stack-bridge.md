# Goldie ↔ WebViewKit 연동 참고

`goldie_front_main` (`origin/development`) 기준 스택 네비게이션 구조입니다.  
npm 패키지 `@ahnseungchan/webviewkit` 은 **웹 단독 스택 UI**이고, 골디 앱은 **RN 브릿지 + Next 라우터**를 함께 씁니다.

## Goldie (소비처)

| 경로 | 역할 |
|------|------|
| `hooks/navigation/useStackRouter.ts` | `stackRouterBridge.push` / 웹 `router.push` |
| `lib/urlQueryUtils.ts` | `stackRouter=1` 쿼리 |
| `features/bridge/router/stackRouterBroadcast.ts` | 탭/웹뷰 동기화 |

## WebViewKit (라이브러리)

| API | 역할 |
|-----|------|
| `StackRouterProvider` | 화면 스택 + CSS 전환 |
| `useStackRouter` | `push` / `back` / `visiblePages` |
| `StackDevRoadmap` | 개발 시 스택 depth 시각화 |
| `history` | `pushState` 래퍼 |

## v1.1.0

- `enableDevTools` — 스택 로드맵 오버레이
- npm tarball `dist/index.js` 경로 수정

동기화 일자: 2026-05-25
