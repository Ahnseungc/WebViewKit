---
name: github-pr-description
description: >-
  Goldie 저장소에서 GitHub PR 본문을 쓸 때: 실제 줄바꿈 마크다운, Jira GD 링크,
  불릿·백틱, CI/배포 시 시크릿 안내. gh pr create 시 --body-file 사용,
  리터럴 \\n 금지. PR 템플릿은 .github/pull_request_template.md.
  Use when the user says PR, 풀리퀘, pull request, PR 본문, gh pr create, PR 설명.
---

# GitHub PR 본문 (Goldie)

## 원본 규칙

`.cursor/rules/github-pr-description.mdc` 와 `.github/pull_request_template.md` 를 따른다.

## 에이전트 체크리스트

1. **본문 생성**: `gh pr create --body-file <파일>` 로 저장 후 전달하거나, 사용자가 붙여넣을 **완성 마크다운**을 출력한다. `--body`에 긴 한 줄 + `\n` 문자를 넣지 않는다.
2. **Jira**: `goldie-team.atlassian.net/browse/GD-번호` 마크다운 링크.
3. **섹션**: 요약 → Jira(해당 시) → 변경 사항 → 팀 설정(시크릿·환경 필요 시) → 참고/스크린샷.
4. **CI·배포**: 새 GitHub Actions 시크릿이면 이름·Environment(`development` 등)·선택 여부를 명시한다.

## 예시 (발췌)

```markdown
## 요약

개발 배포 성공 시 Slack에 배포 요약을 보낸다.

## Jira

- [GD-1014](https://goldie-team.atlassian.net/browse/GD-1014)

## 변경 사항

- `dev-deploy.yml`: 성공 스텝에서 `scripts/ci/...` 실행
```
