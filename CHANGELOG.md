# Changelog

## [1.1.0] - 2026-05-25

### Added

- `StackDevRoadmap` — 개발 환경 스택 깊이·경로 시각화 (점→선 로드맵)
- `enableDevTools` on `StackRouterProvider` (기본: `NODE_ENV === "development"`)
- `STACK_TRANSITION_MS` 공통 상수
- 정식 `src/index.ts` export surface

### Fixed

- npm 패키지 `main`/`types` 가 실제 `dist/index.js` 를 가리키도록 빌드 설정 (`noEmit: true` 제거)
- `history` SSR 환경에서 `window` 접근 오류 방지
- push/back `setTimeout` 과 CSS 애니메이션 시간 불일치 완화

### Removed

- 사용하지 않던 `gsap` 의존성

## [1.0.8] - 2025-05

- stack-router 테스트·구조 추가 (`Feat: add stak-router test`, `stack-structer`)
- browser 예제, history 관리

## [1.0.0] - 2025-05-17

- Initial commit, history, browser examples
