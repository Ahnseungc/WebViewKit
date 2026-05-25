---
name: figma-design-to-goldie
description: >-
  Implements Figma screens into Goldie Next.js: use Figma MCP plugin-figma-figma
  (get_design_context, get_variable_defs, search_design_system), compare node
  values to styles/typography.css and color.css tokens, map text to
  text-{d|t|h|b|c}{1|2|3}-{bold|semibold|medium|regular}. No text-p-* utilities.
  Trigger: Figma URL, node-id, 피그마 구현, 디자인 토큰, Code Connect.
---

# Figma 디자인 → Goldie 프론트 구현

원칙·금지 사항은 `.cursor/rules/figma-to-code-typography.mdc` 와 `.cursor/rules/design-system.mdc` 가 원본이다.

## 1. MCP 준비

- 서버: **`plugin-figma-figma`**
- URL에서 **`fileKey`**, **`nodeId`** 추출 (`node-id=1-2` → `1:2`).
- `get_design_context` 에 `clientLanguages=typescript`, `clientFrameworks=react` 등 스키마에 맞게 전달 가능.

## 2. 정보 읽기 (순서 권장)

1. **`get_design_context`** — 레이아웃·텍스트·참고 코드·에셋 URL. **참고 코드는 Goldie 규칙에 맞게 재작성.**
2. **`get_variable_defs`** — 노드에 적용된 Figma Variables(색, 숫자). `color.css` / 타이포 CSS 변수와 이름·값 대조.
3. **`search_design_system`** — 공용 컴포넌트·스타일이 라이브러리에 있으면 재사용 우선.

## 3. 타이포 매핑 알고리즘

1. 텍스트 노드에서 **fontSize, lineHeight, letterSpacing, fontWeight** 를 읽는다.
2. `styles/typography.css` 의 `@theme inline` 에서 동일 조합에 가장 가까운 `--text-*` 블록을 찾는다.
3. 해당 블록에 대응하는 **`@utility`** 이름을 그대로 클래스로 쓴다: `text-h1-bold`, `text-b2-regular` 등.
4. 사용자가 말하는 **「h1이면 text-h1-bold」** 는 **스타일이 실제로 h1 토큰과 일치할 때** 적용한다. 불일치하면 **일치하는 계층(t/h/b/c)** 을 고른다.
5. **「p 본문」** 은 레포에 `text-p-*` 가 없으므로 **`text-b1-*` / `text-b2-*` / `text-b3-*`** 중 Figma 수치와 맞는 것을 선택한다. (예: 16px bold 본문 → `text-b2-bold`가 흔함 — 반드시 파일의 `--text-b2-*` 와 비교.)

### 3.1 타이포 오매핑이 잦은 이유 (원인)

디자인 QA에서 **폰트가 DS와 어긋나는 경우**, 아래를 우선 의심한다. 상세 표는 **`.cursor/rules/figma-to-code-typography.mdc` — 「흔한 오매핑 원인」** 이다.

- **`get_design_context` 참고 코드를 그대로 씀** → `text-[px]`·일반 Tailwind 클래스로 남고 Goldie `text-t2-bold` 등으로 바꾸지 않음.
- **`<h1>` / 레이어 이름 "Heading"만 보고 `text-h1-*`에 고정** → 실제 Figma 수치는 Title(`t1`/`t2`)인 경우가 많음. **수치(및 variable)로만** `text-*` 를 고른다.
- **fontSize만 맞추고 lineHeight·letterSpacing을 안 봄** → 같은 pt라도 유틸마다 행간·자간이 다름.
- **없는 variant(`-medium` 등)를 가정** → `typography.css`에 정의된 `@utility` 만 사용.
- **타이포 `text-t2-bold`와 텍스트 색 `text-text-default`를 한 축으로만 적용** → 둘 다 필요할 수 있음.

**재발 방지:** Figma 1노드당 **한 개의 타이포 유틸**로 수렴한 뒤, PR/셀프 QA에서 `typography.css`의 해당 `--text-*-line-height` 등과 **한 번 더** 맞춘다.

## 4. 색·간격

- 색: Figma fill ↔ `styles/color.css` 시맨틱 (`text-text-primary`, `bg-bg-default` 등).
- 간격·라디우스: `design-system.mdc` 의 spacing·`styles/radius.css` 유틸.
- 그림자(box-shadow): Figma effects(drop shadow)를 `design-system.mdc`의 전용 그림자 유틸(`shadow-all`, `shadow-top`, `shadow-bottom`, `shadow-y`, `shadow-b`)과 대조해 매핑한다. 임의 `shadow-[...]`/inline `box-shadow`는 쓰지 않는다.
- 리스트: Figma가 `ul > li` marker(가운데 점/숫자)를 쓰면 marker 그대로 구현한다. (`list-disc`/`list-decimal` 또는 점 요소) **세로 border 라인으로 대체하지 않는다.**
- 리스트/그리드 컨테이너는 `ul > li`라는 구조만 보고 border를 넣지 않는다. border는 Figma의 stroke가 명시된 경우에만 사용한다.
- 하단 여백은 위치까지 맞춘다. Figma에서 footer 블록에만 `padding-bottom`이면 footer에만 적용하고, 루트 `main` 전체 `pb-*`로 뭉뚱그려 넣지 않는다.

## 5. 구현 시

- **동적 카피**: Figma의 `HH:MM`, `yyyy.MM.dd`, 예시 금액 등 **자리 표시 텍스트**를 사용자 노출 문자열로 **리터럴 고정하지 않는다**. API·스펙 필드에 매핑하거나, 필드가 없으면 폴백을 스펙에 명시한다. 상세: **`.cursor/rules/figma-placeholder-user-visible.mdc`**.
- `components/ds/` 는 **수정 금지**; 조합·래핑만.
- 공통 UI 탐색·신규 여부: `.cursor/skills/design-reuse-first/SKILL.md` (또는 `.cursor/rules/design-reuse-components.mdc`).
- `next/image`, SVG 아이콘 규칙은 `design-system.mdc` 준수.

## 6. MCP 반영 후 — 토큰·노드 재검증 및 아이콘(SVG)

- 노드 값 처리의 **표준 순서**는 **`.cursor/rules/figma-mcp-three-pass-compare.mdc`** 의 **제1~3회 비교 → 구현**이다. `get_design_context` / `get_variable_defs` 후 **코드 작성은 제3회 직후**에 시작한다. **기준 스크린샷·구현 후 시각 QA**는 **`.cursor/rules/figma-mcp-screenshot-qa.mdc`**, **`.cursor/skills/figma-mcp-screenshot-qa/SKILL.md`**.
- 구현 **이후**에도 `.cursor/rules/figma-mcp-verify-tokens-icons.mdc` §4 체크리스트로 **한 번 더** 스캔한다.
- **아이콘**은 Figma에서 **SVG로 추출**(Copy as SVG / Export SVG)하고, `components/svgIcons/<도메인>/` 에 **React 컴포넌트**로 둔다. 실행 순서·트리거는 `.cursor/skills/figma-mcp-implementation-verify/SKILL.md` 를 따른다.

## 7. 커뮤니케이션

- 사용자 응답은 **한국어**.
- 토큰을 고른 근거를 짧게 적어도 좋음 (예: “Figma 16/700 → `--text-b2-*` 와 일치 → `text-b2-bold`”).
