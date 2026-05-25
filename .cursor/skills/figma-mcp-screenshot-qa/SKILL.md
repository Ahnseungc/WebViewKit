---
name: figma-mcp-screenshot-qa
description: >-
  After reading a Figma node via MCP, captures get_screenshot as a visual
  baseline, then after implementation performs one more QA pass comparing the
  built UI to that screenshot. Triggers: 피그마 스크린샷, 시각 QA, get_screenshot,
  노드 캡처, 디자인 대조, 구현 후 QA.
---

# Figma MCP — 초기 스크린샷 · 구현 후 시각 QA

원칙 문서: **`.cursor/rules/figma-mcp-screenshot-qa.mdc`**

## 에이전트가 할 일

1. **노드 확정** — URL에서 `fileKey`, `node-id` 추출(하이픈 → MCP는 `1:2` 형식 등 스키마에 맞게).
2. **`get_design_context`** 전후로 **`get_screenshot`**(`plugin-figma-figma`)을 호출해 **기준 이미지**를 확보한다. 실패 시 사용자에게 **피그마 PNG/캡처**를 요청한다.
3. **3회 값 비교·구현**은 **`.cursor/skills/figma-mcp-implementation-verify/SKILL.md`** 를 따른다.
4. **구현 완료 후** — 로컬 화면(또는 사용자 제공 스크린샷)과 **룰 §1에서 남긴 기준 캡처**를 비교해 **시각 QA 한 번**: 간격, 라디우스, CTA, 타이포 위계, 시트 형태 등.
5. 차이가 있으면 **수정**하거나, 프로젝트 제약으로 어긋난 경우 **짧게 이유**를 남긴다. MCP와 다르지만 **스펙·레이아웃·CMS가 정본**인 경우는 **`.cursor/rules/figma-mcp-verify-tokens-icons.mdc`** 의 **「MCP·단일 프레임 vs 웹 구현」** 을 적용해 **의도된 차이**로만 기록하고 불필요한 1:1 강제는 하지 않는다.
6. 페이지 전체 QA(웹뷰 배경색 불일치/아이콘 누락) 이슈면 **`.cursor/skills/figma-mcp-webview-page-qa/SKILL.md`** 절차를 이어서 적용한다.

## 금지

- 기준 캡처 없이 “느낌만”으로 시각 QA를 건너뛰기(MCP·사용자 이미지 모두 불가할 때만 예외이며, 그때는 사용자에게 한계를 알린다).

## 관련

- 토큰 3회 비교: `.cursor/rules/figma-mcp-three-pass-compare.mdc`
- 웹뷰 페이지 배경·아이콘 QA: `.cursor/rules/figma-mcp-webview-page-qa.mdc`
- `get_screenshot` 단계 예시: Cursor 플러그인 캐시 `figma-implement-design` 스킬 Step 3

## 커뮤니케이션

- 사용자 응답은 **한국어**로 한다.
