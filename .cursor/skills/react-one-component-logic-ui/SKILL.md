---
name: react-one-component-logic-ui
description: >-
  Applies one default-export React component per TSX file, keeps files under
  ~300 lines, and splits logic from presentational UI. Use when creating or
  refactoring TSX, Container/View, large components, or when the user mentions
  한 파일 한 컴포넌트, 300줄, 컴포넌트 분리, 로직 UI 분리, View Container.
---

# 한 파일 한 컴포넌트 · 로직/UI 분리

원본 규칙: `.cursor/rules/component-one-per-file.mdc`, `.cursor/rules/logic-ui-separation.mdc`, `.cursor/rules/component-max-lines.mdc`

## 에이전트가 할 일

1. **새 화면·위젯 TSX**를 만들 때: **default export 컴포넌트 1개**만 두고, 추가 UI는 **별도 파일**로 나누거나(권장), 같은 파일이면 **export 없는** 아주 작은 서브 조각만 허용한다.
2. **로직이 길어지면** 먼저 **`useXxx` 커스텀 훅** 또는 **Container(데이터·핸들러) + View(props만)** 로 나눈다. 순수 계산은 `model/`·`utils/`의 `.ts`로 뺀다.
3. **기존 파일**에 named export 컴포넌트가 여러 개 있으면, 사용자 요청 범위 안에서 **파일 분리**를 제안하거나 수행한다.
4. **RSC**: `page.tsx`는 얇게 유지하고, 인터랙션은 `'use client'` **최소 단위**로만 분리한다 (`project-architecture.mdc`).
5. **줄 수**: 단일 TSX/JSX 파일이 **300줄을 넘으면** 분리(자식 컴포넌트·훅·View)를 우선한다. 250줄 부근부터 과밀 징후로 본다.

## 작업 전 체크리스트 (필수)

1. 이번에 수정할 TSX/JSX 파일의 현재 줄 수를 먼저 확인한다.
2. 250줄 이상이면 과밀 위험으로 보고, 변경 전에 분리 지점을 먼저 잡는다.
3. 300줄 초과 파일을 건드리는 경우, 같은 작업에서 줄이기 분리를 함께 수행한다.
4. 분리가 불가피하게 어려우면 사유와 후속 분리 계획을 사용자에게 즉시 공유한다.

## 금지

- 한 `.tsx`에 **서로 다른 화면 단위**를 named export로 여러 개 두기.
- View 컴포넌트에 **서비스 직접 호출**·거대한 `useEffect` 묶음을 남겨 두기(분리 우선).
- **의도 없이** 한 컴포넌트 파일을 **300줄 이상**으로 키우기.

## 관련 규칙

- `code-style.mdc` (React/Import), `state-data-management.mdc` (Query/훅), `design-system.mdc` (UI 토큰)
- 토스트: `.cursor/skills/use-toast-success-error/SKILL.md`, `toast-useToast-success-error.mdc`
