---
name: commit-after-task-complete
description: >-
  After finishing a user-requested coding or doc task, always run git status,
  stage intentional changes, and commit with Korean message per
  commit-convention.mdc; split commits per git-incremental-commits when needed.
  Do not auto-push unless asked. Triggers: 모든 작업 커밋, 작업 끝, 커밋 남겨, 완료 후 커밋,
  끝나면 커밋.
---

# 작업 완료 후 **무조건 커밋**

규칙 원본: `.cursor/rules/git-commit-after-task.mdc`

## 체크리스트 (응답 보내기 전)

1. **`git status`** — 무엇이 바뀌었는지 확인.
2. **커밋 실행** — 파일 변경이 있으면 반드시 커밋한다.
3. **`git add`** — 이번 작업 범위에 맞는 파일만. `.env` 등 민감 파일은 기본 제외(이미 추적 중이면 팀 규칙 따름).
4. **커밋 분할** — 한 턴에 `feat` + `chore`가 섞였으면 **`.cursor/rules/git-incremental-commits.mdc`** 대로 **여러 커밋**.
5. **`git commit -m "<type>: <한글 설명>"`** — `.cursor/rules/commit-convention.mdc` 준수.
6. **사용자에게** — 커밋 해시 또는 메시지 한 줄로 알림. 푸시는 요청 시에만.

## 메시지 예시

- `feat: 금거래소 메인 헤더 UI 추가`
- `fix: 알림 목록 빈 상태 오류 수정`
- `docs: gold-exchange 스펙 README 추가`
- `chore: Cursor 룰 파일 추가`

## 커뮤니케이션

- 사용자 응답은 **한국어**.
