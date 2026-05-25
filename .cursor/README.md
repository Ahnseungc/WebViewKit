# WebViewKit — Cursor 설정

`goldie_front_main` `origin/development` (2026-05-22 기준)에서 동기화한 **룰·스킬·서브에이전트**입니다.

## 이 저장소에서 쓸 에이전트

| 에이전트 | 용도 |
|---------|------|
| `webviewkit-orchestrator` | 패키지 개발 → 테스트 → npm 배포 파이프라인 위임 |
| `webviewkit-core` | `packages/core` 스택 라우터·history·dev roadmap |
| `webviewkit-qa` | Jest·브라우저 데모·회귀 |

골디 앱 전용: `goldie-ui`, `goldie-qa`, `goldie-orchestrator` 등 — **참고용**(Next.js 앱 규칙). WebViewKit 작업 시에는 위 3개를 우선합니다.

## 스킬

| 스킬 | 용도 |
|------|------|
| `webviewkit-library` | 모노레포·API·enableDevTools |
| `webviewkit-npm-publish` | 빌드·pack·publish 체크리스트 |
| `commit-after-task-complete` / `incremental-commit-workflow` | 커밋 (공통) |

## 룰

- **`webviewkit-monorepo.mdc`** — 이 패키지 저장소 전용 (alwaysApply)
- `goldie-*` `.mdc` — 골디 B2C에서 가져온 참고 규칙 (경로·스택이 다르면 무시)
