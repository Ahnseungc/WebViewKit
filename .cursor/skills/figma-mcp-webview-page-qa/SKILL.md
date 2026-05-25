---
name: figma-mcp-webview-page-qa
description: >-
  Verifies WebView full-page visual parity from a Figma node, focusing on
  background layer mismatches and missing icons. Uses get_design_context,
  get_metadata, and get_screenshot to build a checklist and compare to code.
  Triggers: 웹뷰 배경색 다름, 아이콘 누락, 페이지 전체 디자인 QA, figma QA.
---

# Figma MCP — WebView 페이지 QA (배경색/아이콘 누락)

원본 규칙: `.cursor/rules/figma-mcp-webview-page-qa.mdc`

## 언제 사용

- 사용자가 “페이지 전체 배경색이 Figma와 다르다”, “아이콘이 빠진 것 같다”처럼
  **화면 전체의 시각 완성도**를 점검하려고 할 때.

## 에이전트 절차

1. **기준 수집**
   - `get_design_context` + `get_screenshot`로 기준 확보.
   - 아이콘·섹션 경계를 위해 필요 시 `get_metadata` 호출.
   - 이 단계에서 아이콘 asset URL 중 **`.svg` 후보 목록**을 먼저 만든다.

2. **배경색 레이어 표 작성**
   - 상단/중단/하단 주요 구간별로 `Figma fill` ↔ `코드 bg 클래스`를 매핑한다.
   - 루트(`main`)와 각 섹션(`section/div`)을 분리해서 본다.

3. **아이콘 인벤토리 표 작성**
   - Figma 아이콘 목록(이름/개수/구간)을 뽑는다.
   - 코드의 `components/svgIcons/*` import 및 렌더 분기와 1:1 대조한다.
   - 인벤토리에 있는데 `.svg` 확보가 안 된 항목은 **누락**으로 표시하고 수동 추출 요청 대상에 올린다.

4. **시각 QA 1회 추가**
   - 구현 화면 캡처와 기준 캡처를 나란히 보고
     - 배경색 전환 지점
     - 아이콘 존재/크기/정렬
     를 점검한다.

5. **수정/보고**
   - 불일치 항목은 우선순위로 정리:
     1) 배경색 누락/오염
     2) 아이콘 미노출
     3) 크기·정렬
   - 수정 후 다시 4단계로 재확인.

## 체크 핵심

- 루트 배경(`bg-white`, `bg-bg-secondary`)이 Figma 최상위 fill과 맞는가
- `-mx-*` 확장 구간에서 의도치 않은 흰 띠/색 단절이 없는가
- 아이콘이 `<img>` 래스터로 우회되지 않았는가 (SVG 컴포넌트 원칙)
- 조건부 분기 때문에 특정 상태에서만 아이콘이 사라지지 않는가
- 리스트가 `ul > li` marker 디자인인데 `border-l`/`w-0.5` 라인으로 바뀌지 않았는가
- 리스트/그리드 카드에 Figma에 없는 border가 `ul > li`라는 이유로 추가되지 않았는가
- Figma footer `padding-bottom`이 루트 `main` 전체 `pb-*`로 잘못 확장되지 않았는가

## 학습된 페이지별 보정 규칙 (collect-gold/invite)

- 헤더 우측 액션이 단순 `rightText`인지 확인하고, Figma가 pill 버튼이면 `rightIcon`에 커스텀 버튼(아이콘+텍스트)으로 맞춘다.
- `친구들이 모은 금` 아래 `누적 담은 금`은 2줄 스택이 아니라 **한 줄 인라인(라벨+값)** 구조인지 확인한다.
- CTA 비활성 버튼 문구가 동일해도 색 토큰(`text-disable`, `fill-grayscale-gray100`)과 높이(`h-[50px]`)를 우선 비교한다.
- 상단 Hero 우측 일러스트 크기는 `132px` 기준으로 맞추고, `InviteMainImage` 렌더 시 비율 왜곡이 없는지 점검한다.

## 관련

- `.cursor/skills/figma-mcp-implementation-verify/SKILL.md`
- `.cursor/skills/figma-mcp-screenshot-qa/SKILL.md`
