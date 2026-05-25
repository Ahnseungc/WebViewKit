---
name: spec-docs-fsd-colocation
description: >-
  Place feature specs next to App Router code: app/.../<route>/_src/specs/README.md
  as entry; optional topic .md in same folder. Use for single-route features;
  use docs/specs/<slug>/ for cross-route or pre-route drafts. Triggers: _src/specs,
  FSD 스펙, 라우트 스펙, 컬로케이션 스펙, 스펙 위치.
---

# 스펙·구현 — 라우트 `_src/` 컬로케이션

규칙 원본: `.cursor/rules/docs-spec-fsd-route-colocation.mdc`

## 언제 여기에 둘까

- 스펙이 **하나의 `app/.../page.tsx` 트리**와 1:1에 가깝다.
- 구현이 이미 `app/.../_src/` (뷰·모델·mock·테스트)에 모여 있다.

→ **`app/(…)/<segment>/page.tsx` 옆 `app/(…)/<segment>/_src/`** 를 우선 사용한다.  
→ 스펙 진입점은 **`app/(…)/<segment>/_src/specs/README.md`** 로 두고, 긴 문서는 같은 폴더의 `*.md` 로 분리한다.

## 언제 `docs/specs/` 를 쓸까

- 여러 라우트에 걸친 에픽, 또는 **아직 라우트가 없는** 기획-only 초안.

→ `.cursor/skills/spec-docs-by-feature/SKILL.md` 및 `docs-spec-by-feature.mdc` 를 따른다.

## 체크리스트

1. `<segment>/_src/` 아래에 화면 구현 파일(`View`, 테스트, 필요 시 model/mock)이 모여 있는지 먼저 확인한다.
2. `_src/specs/README.md` 에 **목적·범위/비목표·Jira·Figma·라우트 표** 를 넣는다.
3. 옛 `docs/specs/<slug>/` 에 문서가 있었다면 **리다이렉트용 README 한 줄** 또는 본 README만 남긴다.
4. `docs/specs/README.md` **등록 목록**에 진입점 경로를 **백틱 절대(리포 루트) 경로**로 반영한다.

## 커뮤니케이션

- 사용자 응답은 **한국어**.
- 생성·이전한 **풀 경로**를 알려 준다.
