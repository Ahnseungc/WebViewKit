---
name: figma-mcp-implementation-verify
description: >-
  When the user gives a Figma node (URL/node-id), compares MCP values to design
  tokens in three mandatory passes, then implements. Uses plugin-figma-figma
  get_design_context, get_variable_defs, search_design_system; maps to
  typography.css, color.css, radius.css; SVG icons to components/svgIcons.
  Triggers: 피그마 MCP, 노드 값, 3번 비교, 세 번 대조, 토큰 재검증, get_design_context,
  figma 노드 구현, get_screenshot, 시각 QA, 스크린샷 대조.
---

# Figma MCP 구현 — **3회 값 비교 → 구현** · 토큰 재검증 · SVG 아이콘

Goldie에서 피그마 MCP로 화면을 구현할 때 **에이전트가 따를 실행 순서**다.

**필수:** 사용자가 **피그마 노드**(URL의 `node-id` 또는 데스크톱 MCP의 선택 노드)를 주면, **기준 스크린샷(`get_screenshot`) 확보 → 제1~3회 비교를 모두 마친 뒤에만** TSX/TS 구현을 시작하고, **구현 후 시각 QA**까지 한다. (`.cursor/rules/figma-mcp-three-pass-compare.mdc`, **`.cursor/rules/figma-mcp-screenshot-qa.mdc`**, **`.cursor/skills/figma-mcp-screenshot-qa/SKILL.md`**)

원칙·금지 사항의 원본은 `.cursor/rules/figma-mcp-verify-tokens-icons.mdc`, `.cursor/rules/figma-to-code-typography.mdc`, `.cursor/rules/design-system.mdc` 이다.

## 0. 세 번 값 비교 (구현 전 고정 순서)

| 회차 | 하는 일 | 끝나면 |
|------|---------|--------|
| **제1회** | `get_design_context` (+ 필요 시 `get_metadata`·자식 노드), `get_variable_defs` 결과를 **figma-mcp-verify-tokens-icons §1 표**와 대조해 타이포·색·반경·간격을 **토큰 클래스로 매핑**한다. | 짧은 **매핑 메모** |
| **제2회** | 제1회 매핑이 **figma-to-code-typography**, **design-system**, **figma-design-to-goldie** 와 충돌 없는지 재확인. `search_design_system`·**design-reuse-first** 로 DS/공통 UI 우선. 아이콘은 SVG 경로 확정. | **쓸 컴포넌트·클래스 목록** 확정 |
| **제3회** | **figma-mcp-verify-tokens-icons §4** 체크리스트로 임의값·금지 패턴 잔존 여부 점검. WebView/하단 CTA 필요 시 **webview-bottom-cta**, **lib/layout/pcWebviewColumnLayout** 등과 정합. | **이때부터 코드 작성** |

MCP가 **한도·오류로 실패**하면 3회 비교를 완료할 수 없으므로 사용자에 알리고, 스크린샷·스펙 등 **대체 입력** 합의 후 진행한다.

## 1. 언제 읽을지

- 사용자가 Figma URL·`node-id`를 주거나, **`get_design_context`** / **`get_variable_defs`** 를 호출한 뒤 구현할 때 이 스킬을 적용한다.
- `figma-use` / `use_figma` 가 필요한 **캔버스 쓰기** 작업과 구분한다. 본 스킬은 **읽기 → 코드 반영** 흐름에 해당한다.

## 2. MCP 읽기 순서 (권장)

1. **`get_design_context`** — 레이아웃, 텍스트, 참고 코드, 에셋 URL. 참고 코드는 **Goldie 토큰으로 재작성**한다.
2. **`get_screenshot`** — 동일 `fileKey`·`nodeId`로 **기준 캡처**를 남겨 시각 베이스라인으로 삼는다. (실패 시·한도 시: `.cursor/rules/figma-mcp-screenshot-qa.mdc` 대체)
3. **`get_variable_defs`** — 노드에 연결된 Variables가 있으면 **이름·값**을 확보해 `color.css` / 타이포 변수와 대조한다.
4. 아이콘이 있는 화면이면, **노드 읽기 단계에서** `get_design_context` asset 중 `.svg`를 먼저 모으고 필요 시 `get_metadata`로 아이콘 인벤토리(구간/개수)를 만든다.
5. 필요 시 **`search_design_system`** — 라이브러리 컴포넌트·스타일 재사용 가능 여부 확인.

## 3. 토큰·노드 재검증 (필수)

제0절 **3회 비교**에 포함된 내용이다. 구현 코드를 쓴 **이후**에도 룰 **`.cursor/rules/figma-mcp-verify-tokens-icons.mdc`** §4로 **최종 스캔**한다.

- **타이포:** Figma의 **fontSize·fontWeight·lineHeight·letterSpacing** 를 **한 세트로** `styles/typography.css` 의 `@utility` **한 개**로 수렴시키는지 확인한다. `text-p-*` 는 없다 → `text-b1~b3-*` 등으로 매핑 (`.cursor/skills/figma-design-to-goldie/SKILL.md` 알고리즘 참고). **오매핑 다발 원인**(MCP 참고 코드 복붙, 태그/레이어 이름으로 `text-h1-*` 고정, fontSize만 대조)은 **`.cursor/rules/figma-to-code-typography.mdc` — 「흔한 오매핑 원인」** 에 정리돼 있으니 QA 시 해당 표로 점검한다.
- **색:** fill/stroke → `styles/color.css` 시맨틱만. MCP 출력의 Hex·`bg-[#...]` 는 치환한다.
- **반경·간격:** `styles/radius.css`, spacing(4px 단위), `design-system.mdc` 의 레이아웃 규칙과 맞춘다.
- **그림자(box-shadow):** Figma effects(drop shadow)의 offset/blur/spread/color를 읽고 `shadow-all`/`shadow-top`/`shadow-bottom`/`shadow-y`/`shadow-b` 중 대응되는 전용 유틸로 매핑한다. 임의 `shadow-[...]`나 inline `box-shadow`는 사용하지 않는다.
- **그림자 불일치 처리:** 기존 유틸과 수치 차이가 큰 경우, feature 의미를 담은 유틸(예: `shadow-gold-exchange-holdings`)을 추가하고 해당 유틸로 반영한다. "대충 가까운 그림자"로 넘기지 않는다.
- **헤더 shadow 검증:** `NavigationHeader`/상단 래퍼는 Figma effect에 shadow가 있을 때만 `shadow-*`를 적용한다. 디자인에 없으면 기본값으로도 넣지 않는다.
- **하단 CTA 구현 방식:** CTA 버튼은 `components/ds/button`의 `Button`을 우선 사용한다. 링크형 버튼은 `Button asChild` + `Link`로 구현하고, `buttonVariants(...)` 클래스 문자열만 직접 조합하는 패턴은 지양한다.
- **루트 배경색 정합:** `main` 루트 배경 토큰(`bg-bg-default`/`bg-bg-secondary`)은 Figma 최상위 프레임 fill과 1:1로 맞춘다.
- **spacing 범위:** Figma가 footer/특정 section에만 `padding-bottom`을 준 경우, 해당 섹션에만 반영한다. 루트 `main`에 일괄 `pb-*`를 넣어 치환하지 않는다.
- **리스트 마커:** Figma가 `ul > li` 점/숫자 marker를 의도하면 `list-disc`/`list-decimal` 또는 점 요소(`rounded-999` 작은 dot)로 구현한다. **세로 border 라인(`w-0.5`, `border-l`)으로 치환하지 않는다.**
- **리스트 stroke 추론 금지:** `ul > li` 구조라는 이유만으로 카드 border를 추가하지 않는다. border는 **Figma stroke가 확인될 때만** 넣는다.
- **마커 형태 애매할 때:** `get_design_context`에서 `2px x 22px` 벡터처럼 보이면 오해하기 쉬우므로, **`get_screenshot`을 우선 기준**으로 점(`·`) vs 라인 형태를 확정한다. 스크린샷이 점이면 점 마커로 구현한다.
- **마커 크기 매핑:** 노드에 `w=2px, h=22px`가 보이면 점 하나(`2px`)만 두지 말고, **마커 래퍼(2x22) + 중앙 점(2x2)** 구조로 매핑해 줄간격/정렬 오차를 방지한다.

**재검증이 끝난 뒤**에만 PR·커밋 단위로 남긴다. 불일치가 크면 가장 가까운 토큰 + 짧은 주석 또는 기획 확인을 남긴다.

## 4. 구현 후 — 시각 QA (한 번 더)

- **`.cursor/skills/figma-mcp-screenshot-qa/SKILL.md`** 절차대로, **초기 `get_screenshot` 기준**과 **실행 화면**을 비교해 시각 QA를 마친다.
- 시각 QA가 끝나기 전에는 작업 완료로 응답하지 않는다. 최종 보고에 **비교 노드 ID / 맞춘 항목 / 잔여 차이**를 포함한다.

## 5. 아이콘 — SVG 추출 (필수)

- 아이콘은 **SVG**로 확보한다. Figma: 해당 벡터 노드 **Copy as SVG** 또는 **Export → SVG**.
- 구현 시작 전에, **아이콘 인벤토리의 각 항목이 SVG 확보 완료인지** 확인한다. (`확보됨` / `누락(수동 요청)` 상태 관리)
- 저장 위치: **`components/svgIcons/<도메인>/`** 에 **React 컴포넌트** (`.tsx`). 도메인 폴더는 `design-system.mdc` / 기존 아이콘 구조를 따른다.
- 범용 UI는 `ds/`, 수거·금 관련은 `collect-gold/` 등 기존과 동일한 분류를 쓴다.
- 래스터만 있으면 SVG 소스를 Figma에서 다시보내거나 디자인에 요청한다. **아이콘을 PNG `<img>` 로만 넣지 않는다.**
- `get_design_context`의 `http://localhost:3845/assets/...` 는 MCP 임시 자산이므로 런타임 URL로 사용하지 않는다. 아이콘은 SVG path를 코드에 내재화하고, 이미지는 `public/images` 또는 프로젝트 CDN 자산으로 옮긴다.
- `<pattern>` / `<use xlinkHref>` 형태 SVG는 참조 리소스 누락 시 렌더가 비는 경우가 있어, 구현 후 반드시 실제 화면에서 아이콘 노출 여부를 확인한다.

## 6. DS·공통 컴포넌트

- `components/ds/` 는 **명시 요청 없이 수정하지 않는다.** 래핑·조합만 한다.
- 화면 조립 전에 `.cursor/skills/design-reuse-first/SKILL.md` 로 DS·공통 UI 존재 여부를 확인한다.

### 6.1 모달·얼럿(`Popup/basic`) — 패딩·간격·부제 줄바꿈 (필수 대조)

Figma 노드(예: `14578:17909` `Popup/basic`)를 `get_design_context`로 읽을 때 다음을 **수치 그대로** 확인하고, 구현은 `components/ds/popup/basicPopup.tsx` + `BottomButtons` 조합과 맞춘다.

| 피그마(MCP)에서 볼 것 | 코드에서 맞출 것 | 흔한 불일치 원인 |
|----------------------|------------------|------------------|
| 루트 auto layout **padding**(예: `spacing-200` = 20px) | 카드 래퍼 **`p-5`**(20px) | 카드에 **`pt-*`만** 주고 가로 패딩이 없으면 타이틀·부제가 카드 가장자리에 붙음 |
| 루트에서 **헤더 블록 ↔ 버튼 영역** `gap`(예: 20px) | 카드 `flex flex-col`에 **`gap-5`** | 헤더와 버튼 사이 간격 누락 |
| 헤더 내부 타이틀↔부제 `gap`(예: 8px) | 타이틀 래퍼 **`gap-2`** | — |
| 버튼 스택이 카드 안쪽 패딩선에 맞춰짐 | **`BottomButtons` `padding="p-0"`** | 카드 `p-5`인데 버튼 래퍼 기본 **`p-5`**면 가로·하단 **이중 패딩** |

**부제(subtitle) 줄바꿈:** Figma 텍스트 레이어에 **강제 줄바꿈**이 있으면 카피에 `\n`을 넣는다(`BasicPopup`은 `whitespace-pre-line`). MCP 참고 코드가 **한 줄 `<p>`**로만 나와도, 스크린샷(`get_screenshot`)에서 두 줄로 보이면 **프레임 너비 기준 자동 줄바꿈**일 수 있으므로 **임의 `\n` 삽입 금지** — 카드 **`w-80`(320px)** 등 피그마 프레임 폭과 동일한지 확인한다.

상세 표·체크리스트: `.cursor/rules/figma-mcp-verify-tokens-icons.mdc` §1·§4.

### 6.2 MCP와 구현이 다를 때 — **의도 정합 우선** (금거래소 메인 사례)

`get_design_context`는 **편집기 트리·export 코드**이지 항상 **프로덕트 정본**이 아니다. 아래는 **현재 구현이 맞는 방향**으로 두는 팀 판단이며, 에이전트는 MCP만 보고 **무조건 피그마에 맞춰 고치지 않는다**.

| 주제 | MCP·피그마에서 보이기 쉬한 것 | 구현·스펙 쪽 정본 |
|------|------------------------------|-------------------|
| 유의사항 리스트 마커 | 2px×22 + SVG **막대** | **`ul > li` + 토큰 점 마커** (`GoldExchangeMainNoticeSection`). `border-l` 흉내 금지와 별개로 **가벼운 점** 허용. |
| 보유 금 `GoldIcon` 각도 | 래퍼 `rotate-90` 류 | **공유 SVG** 내부 transform·60px 배치까지 합쳐 **시각 정합** (`rotate-120` 등). MCP 각도 숫자 복붙 금지. |
| 상단 그라데이션 | 단일 프레임 루트 전체 그라데이션 | **App Router 레이아웃·스크롤**에 맞춰 **상단 존만** 그라데이션, 이하 `bg-bg-default` (`GoldExchangeMainView`). |
| 프로모 배너 | 텍스트+일러+`1 \| 9` 합성 | **CMS 이미지·다건 슬라이드**가 정본 (`main-functional-spec` 4.2, `GoldExchangeMainPromoBanner`). 인디케이터는 기획·중복에 따라 생략 가능. |

**원칙 문서:** `.cursor/rules/figma-mcp-verify-tokens-icons.mdc` — **「MCP·단일 프레임 vs 웹 구현」** 절.

## 7. 상호 참조

- 피그마 → 코드 타이포 매핑 상세: `.cursor/skills/figma-design-to-goldie/SKILL.md`
- 시각 QA 전용 스킬: `.cursor/skills/figma-mcp-screenshot-qa/SKILL.md`
- 웹뷰 페이지 QA(배경색·아이콘 누락): `.cursor/skills/figma-mcp-webview-page-qa/SKILL.md`
- 커밋·한글 메시지: `.cursor/rules/commit-convention.mdc`

## 커뮤니케이션

- 사용자 응답은 **한국어**로 한다.
