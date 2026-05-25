---
name: ui-with-rtl-tests
description: >-
  When implementing or changing user-visible UI (pages, views, widgets), add or
  update co-located Vitest + Testing Library (RTL) tests. Triggers: UI 구현,
  화면 구현, RTL, Testing Library, 컴포넌트 테스트, 뷰 테스트, 스모크 테스트,
  접근성 쿼리, 금거래소 화면 등 도메인 UI.
---

# UI 구현 + RTL 테스트 동반

규칙 원본: `.cursor/rules/ui-testing.mdc`, `.cursor/rules/testing.mdc`

## 1. 언제 켜지나

- 새 **페이지·뷰·섹션**을 만들거나, **노출 문구·분기·클릭 동작**을 바꿀 때.
- 사용자가 **“구현만”**이라고 해도, 회귀 방지를 위해 **가능하면 같은 PR/작업 단위**에 최소 1~3개의 `it`을 추가한다.

## 2. 작업 순서 (권장)

1. **구현 범위 파악**: 어떤 역할(heading, button, link)과 카피가 스펙과 1:1인지 적는다.
2. **Red**: `ComponentName.test.tsx`에 `describe` / `it`(한글)로 기대 행동을 적고, 필요 시 `vi.mock('next/image')` 등을 먼저 둔다. 구현 전이면 “모듈 없음” 실패가 아니라 **의미 있는 assertion 실패**가 나오게 한다.
3. **Green**: 구현 또는 수정으로 테스트를 통과시킨다.
4. **`pnpm test` 또는 `npx vitest run <경로>`** 로 해당 파일만 확인한다.

## 3. 쿼리·단언 (프로젝트 관례)

- **역할 우선**: `screen.getByRole('button', { name: '구매하기' })`, `getByRole('heading', { level: 1, name: '…' })`.
- **jest-dom 미사용 시**: `expect(el).toBeTruthy()`, `expect(screen.queryByText('…')).toBeNull()` 등으로 대체 (기존 금거래소 테스트 패턴과 동일).
- **한 `it` = 한 가지 기대** (`testing.mdc` §5).

## 4. 파일 위치

- `FeatureView.tsx` 옆에 `FeatureView.test.tsx`, 또는 `__test__/FeatureView.test.tsx`.
- `app/(protected)/foo/bar/_src/MyView.tsx` → 동일 `_src` 폴더에 `MyView.test.tsx` 권장.

## 5. 하지 않을 것

- 스타일만 바꾸고 DOM 구조·문구가 동일하면 **테스트 추가를 강제하지 않는다**.
- `components/ds/` 소스는 UI 요청 없이 수정하지 않는다. DS는 import만.

## 6. 커뮤니케이션

- 사용자 응답은 **한국어**.
- “추가한 테스트 파일 경로”와 “검증한 역할(예: 헤더 타이틀, 상품 링크 순서)”를 한 줄로 남긴다.
