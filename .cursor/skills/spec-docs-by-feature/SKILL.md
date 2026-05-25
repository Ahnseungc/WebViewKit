---
name: spec-docs-by-feature
description: >-
  Create or update feature specs: prefer app/.../_src/specs/README for a single
  App Router tree; otherwise docs/specs/<feature-slug>/README. Jira, Figma, routes.
  Triggers: 스펙, 기능 문서, docs/specs, spec-driven documentation (전역·다기능).
---

# 기능별 스펙 문서 (`docs/specs/` · 보조로 `_src/specs/`)

규칙 원본: `.cursor/rules/docs-spec-by-feature.mdc` · 라우트 컬로케이션: `.cursor/rules/docs-spec-fsd-route-colocation.mdc`

## 0. 위치 우선순위

- **단일 라우트**에 대응하는 기능 → **`app/.../<route>/page.tsx` 옆 `app/.../<route>/_src/`** 를 우선하고, 스펙은 **`_src/specs/README.md`** 를 진입점으로 둔다 (스킬: `.cursor/skills/spec-docs-fsd-colocation/SKILL.md`).
- **그 외** (여러 라우트, 라우트 전 초안) → 아래 **`docs/specs/<feature-slug>/`** 규칙.

## 1. 폴더 결정 (`docs/specs/`)

- 경로: **`docs/specs/<feature-slug>/`**
- `feature-slug`: 제품/도메인 단위 **kebab-case** (예: `gold-exchange`, `collect-gold`).
- 비슷한 이름의 기존 폴더가 있으면 **재사용**하고, 없으면 새로 만든다.

## 2. `README.md` 구조 (권장 목차)

1. **개요** — 목적 한 줄.
2. **범위 / 비목표**
3. **관련 이슈·디자인** — Jira `GD-xxx`, Figma URL·node-id.
4. **정보 구조·라우트** — 표로 URL ↔ `app/.../page.tsx`.
5. **화면·API·상태** — 필요한 만큼 절제해서 작성.
6. **구현 상태** (선택) — Draft / In progress / Done.

## 3. 추가 파일

- 플로우만 길면 같은 폴더에 `flow.md` 등으로 **분리**하고 README에서 링크한다.

## 4. 기존 `docs/*.md` 와의 관계

- 루트에 흩어진 문서를 **한 번에 옮기지 않아도 된다**. 새 작업은 **`docs/specs/`** 우선.
- 기존 파일을 이관하면 **옛 경로 파일 상단**에 `이 문서는 docs/specs/.../ 로 이전했습니다.` 한 줄을 남겨도 좋다.

## 5. 커뮤니케이션

- 사용자 응답은 **한국어**.
- 새로 만든 경로를 **풀 경로**로 알려 준다.
