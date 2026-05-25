---
name: design-reuse-first
description: >-
  When implementing UI from Figma or specs, search components/ds and shared
  components first; compose or wrap before writing new primitives. New
  components only when no match; never edit components/ds without explicit request.
  Triggers: 디자인 구현, 피그마, 공통 컴포넌트, DS, 화면 구현.
---

# 디자인 구현 — 재사용 우선

규칙 원본: `.cursor/rules/design-reuse-components.mdc`  
DS·토큰: `.cursor/rules/design-system.mdc`

## 1. 구현 전 체크리스트

1. 피그마/스펙에서 **역할**을 이름으로 적는다 (예: “주요 CTA 버튼”, “하단 고정 바”).
2. **`components/ds/`** 에서 동일 역할 검색 (`button`, `popup`, `navigation`, `input` 등 디렉터리명·export).
3. **`components/`** (ds 제외)에서 유사 패턴 검색.
4. 같은 도메인 **`app/**/_src/`**, **`app/**/_components/`**, **`features/`** 에 이미 있는 카드·리스트가 있는지 본다.

## 2. 있을 때

- **import 해서 조합**한다. variant·size props가 있으면 그걸 쓴다.
- 디자인과 **몇 px 어긋난다**면, 먼저 **토큰 클래스(`cn`)로 래퍼**에서만 보정하고, **DS 소스 수정은 하지 않는다.**

## 3. 없을 때

- **신규 파일을 만든다** — 이름은 역할이 드러나게(PascalCase).
- 가능하면 **DS 조각 + div 레이아웃**만으로 끝낸다(신규 “원자” 최소화).
- 두 번째 화면에서 재사용이 보이면 **공통 위치로 이동**을 제안한다.

## 4. 피그마 MCP와 함께 쓸 때

- `get_design_context` 가 생성한 **범용 React**는 그대로 넣지 않고, **위 탐색 결과로 치환**한다.
- 타이포·색은 **`figma-to-code-typography`** / **`design-system`** 규칙에 맞게 유틸 클래스로 바꾼다.

## 5. 커뮤니케이션

- 사용자 응답은 **한국어**.
- “기존 `X` 컴포넌트를 사용했다” 또는 “없어서 `Y`를 새로 추가했다”를 **한 줄**이라도 남긴다.
