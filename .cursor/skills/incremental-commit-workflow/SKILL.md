---
name: incremental-commit-workflow
description: >-
  When implementing large features or refactors in Goldie repo, plan and split
  work into multiple meaningful git commits (feat/refactor/test separation),
  Korean messages per commit-convention.mdc. Avoid tiny or WIP-only commits.
  Triggers: 큰 작업, 커밋 나누기, 쪼개서 커밋, incremental commit, large PR.
---

# 큰 작업 — 커밋 분할 워크플로

규칙 원본: `.cursor/rules/git-incremental-commits.mdc`  
메시지 규격: `.cursor/rules/commit-convention.mdc`

## 1. 시작할 때

변경이 **한 커밋으로는 요약이 어렵다**고 판단되면:

1. **구현 순서**를 정한다 (데이터 계층 → UI, 공통 → 특화 등).
2. **커밋 후보 목록**을 2~5개 bullet로 적는다 (예: `feat: …`, `refactor: …`, `test: …`).
3. 사용자에게 **한 줄로 확인**을 요청해도 좋다(플로우만 맞추면 생략 가능).

## 2. 구현 중

- **한 단위가 끝날 때마다** `git add` 범위를 **그 단위에만** 맞춘다.
- **같은 커밋에** `feat`와 무관한 `refactor`를 넣지 않는다.
- 테스트는 **Red-Green** 흐름이면 실패 테스트 추가 커밋 → 구현 커밋도 가능(팀 관행에 따름). 보통은 **`test:` 를 별도 커밋**으로 두기 쉽다.

## 3. 커밋 메시지

- 형식: `<type>: <한글 설명>` (필요 시 본문 한 줄).
- **각 커밋이 독립적으로 읽혀야** 한다. 이전 커밋 제목을 반복하지 말고, **이 커밋만의 변화**를 쓴다.

## 4. 끝날 때

- **전체 diff가 커밋 순서대로 이해 가능한지** 스스로 점검한다.
- 필요하면 사용자에게 **PR 설명에 커밋 요약**을 붙이라고 안내한다.

## 5. 커뮤니케이션

- 사용자 응답은 **한국어**.
- “지금 단계에서 커밋을 나누는 것이 좋겠다”고 **짧게** 제안할 수 있다.

## 예시 (커밋 나열)

```
feat: 금거래소 메인 라우트 및 레이아웃 스캐폴딩 추가
feat: 메인 히어로 섹션 UI 구현
refactor: 메인 페이지 데이터 훅 분리
test: 메인 히어로 렌더링 단위 테스트 추가
```

(실제 메시지는 작업 내용에 맞게 바꾼다.)
