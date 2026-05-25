---
name: slack-current-task-share
description: >-
  Draft or send a Slack message sharing the current in-progress Jira task (GD)
  using the team template; uses plugin-slack-slack and optionally
  plugin-atlassian-atlassian for issue details. Use when the user says 슬랙,
  작업 공유, 현재 테스크, 작업 중 공유, or wants to post GD ticket status.
---

# Slack — 현재 작업 중 테스크 공유

원본 템플릿·규칙은 `.cursor/rules/slack-current-task-share.mdc` 이다.

## 1. 정보 수집

1. **Jira 키** (`GD-xxx`) — 사용자가 주지 않았으면 `git branch --show-current` 로 `feature/GD-번호` 패턴에서 번호를 추론하거나 질문한다.
2. **이슈 제목·상태** — Atlassian MCP `getJiraIssue` 또는 `searchJiraIssuesUsingJql` (`key = GD-xxx`). MCP 없으면 사용자에게 제목·상태를 묻는다.
3. **Slack 채널** — `slack_search_channels` 로 검색하거나 사용자에게 채널명을 확인한다. **채널 ID를 임의로 가정하지 않는다.**

## 2. 본문 만들기

`.cursor/rules/slack-current-task-share.mdc` 의 **블록 템플릿**을 채운다.

- Jira 베이스 URL은 팀 사이트 기준으로 쓴다 (예: `https://goldie-team.atlassian.net/browse/GD-997`).
- 브랜치는 `.cursor/rules/jira-git-branch.mdc` 에 맞춘다 (일반 작업: `feature/GD-<번호>`).

## 3. Slack 전송

- 서버 식별자: **`plugin-slack-slack`** (환경에 따라 UI 이름은 `slack`).
- **검토 전**: `slack_send_message_draft` 로 초안 생성 → 사용자 확인.
- **전송**: `slack_send_message` — 인자는 스키마대로 **`channel_id`**, **`message`** (템플릿 본문).
- 스레드에만 올릴 경우 `thread_ts` 사용.

## 4. 커뮤니케이션

- 사용자에게는 **한국어**로, 붙여넣을 최종 문구 또는 전송 결과(메시지 링크가 있으면 함께)를 짧게 전달한다.

## 예시 (치환 완료)

```markdown
🔧 **작업 중 공유**
• **티켓** | **GD-997** — [B2C] 금거래소 메인 페이지
• **브랜치** | `feature/GD-997` (기준: `development`)
• **상태** | Backlog/Todo — 라우트·레이아웃 스캐폴딩 중
• **링크** | https://goldie-team.atlassian.net/browse/GD-997
```
