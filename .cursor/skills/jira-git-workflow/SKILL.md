---
name: jira-git-workflow
description: >-
  Goldie 프론트 저장소에서 Jira GD 이슈와 Git 브랜치를 맞출 때: feature/GD-<번호>
  from development; bug fix and hotfix branch from main; optional Atlassian MCP로 이슈 확인.
  Use when the user mentions Jira, GD-, 브랜치, feature branch, or 이슈 번호.
---

# Jira · Git 워크플로 (골디 프론트)

저장소 규칙의 원본은 `.cursor/rules/jira-git-branch.mdc` 이다. 이 스킬은 **브랜치 만들기·PR 안내·Jira 연동** 시 에이전트가 따를 단계다.

## 언제 쓰는가

- 사용자가 **Jira 이슈 번호(GD-xxx)** 를 주었거나, 브랜치 이름·베이스 브랜치를 물을 때
- **새 기능 브랜치**를 제안하거나 `git checkout -b` 예시를 쓸 때
- Atlassian MCP로 **이슈 제목·타입**을 확인한 뒤 버그/핫픽스 여부를 판단할 때

## 브랜치 규칙 (핵심)

1. **일반 작업** (Jira 이슈 타입이 버그·핫픽스가 아닌 경우: 작업, 스토리, 에픽 하위 작업 등)  
   - 이름: **`feature/GD-<숫자>`** (예: `feature/GD-916`)  
   - 분기: **`development`**

2. **버그**  
   - 이름: **`fix/GD-<숫자>`**  
   - 분기: **`main`** (버그·핫픽스는 `development`가 아닌 베이스에서 분기하는 예외)

3. **핫픽스**  
   - 이름: **`hotfix/GD-<숫자>`**  
   - 분기: **`main`**

팀이 **특정 `release/*` 브랜치**만 운영 반영에 쓰는 경우, 버그·핫픽스 베이스를 그 브랜치로 바꿀 수 있다. 불확실하면 사용자에게 한 번 확인한다.

## 권장 Git 명령 예시

일반 기능 (`GD-916` 가정):

```bash
git fetch origin
git checkout development
git pull origin development
git checkout -b feature/GD-916
```

버그 (`GD-888` 가정):

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b fix/GD-888
```

핫픽스 (`GD-999` 가정):

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b hotfix/GD-999
```

## Jira 확인 (Atlassian MCP)

MCP 서버 식별자는 환경에 따라 **`plugin-atlassian-atlassian`** 일 수 있다(설정 UI에는 `atlassian`으로 보일 수 있음).

- 접속 사이트·`cloudId`: `getAccessibleAtlassianResources`
- 현재 사용자: `atlassianUserInfo`
- 이슈 목록·타입: `searchJiraIssuesUsingJql` (예: `key = GD-916`)

이슈 **유형(버그 / 작업 등)** 을 본 뒤 위 표에 맞는 **브랜치 접두사(`feature` vs `fix` vs `hotfix`)** 를 고른다.

## 커뮤니케이션

- 사용자 응답은 **한국어**.
- 브랜치·베이스를 제안할 때 **이슈 키·한 줄 요약**을 같이 적는다.
