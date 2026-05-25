# WebViewKit — Agent Index

Cursor **서브에이전트**·**스킬**·**룰** 진입점입니다.  
설정은 `goldie_front_main` `origin/development` 에서 동기화했습니다.

## 서브에이전트 (이 repo 우선)

| name | 파일 |
|------|------|
| `webviewkit-orchestrator` | `.cursor/agents/webviewkit-orchestrator.md` |
| `webviewkit-core` | `.cursor/agents/webviewkit-core.md` |
| `webviewkit-qa` | `.cursor/agents/webviewkit-qa.md` |

예: *webviewkit-orchestrator로 push 애니 버그 수정하고 QA까지*

## 골디 (참고·복사본)

| name | 파일 |
|------|------|
| `goldie-orchestrator` | `.cursor/agents/goldie-orchestrator.md` |
| `goldie-ui` / `goldie-qa` / `goldie-react` / `goldie-api` | `.cursor/agents/` |

## 스킬

- `webviewkit-library`, `webviewkit-npm-publish`
- 공통: `commit-after-task-complete`, `incremental-commit-workflow`, `github-pr-description`

## Claude

- `.claude/settings.json`

## 문서

- [CHANGELOG.md](./CHANGELOG.md)
- [packages/core/README.md](./packages/core/README.md)
- Native bridge: `docs/native-bridge-protocol.md`
