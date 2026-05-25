---
name: e2e-flow-playwright
description: >-
  Automate user flows with Playwright E2E: add or update e2e/*.spec.ts, fixtures,
  playwright.config. Triggers: E2E, e2e, 플로우 테스트, 엔드투엔드, Playwright,
  시나리오 테스트, 크리티컬 경로, 회귀 테스트 브라우저, user journey, codegen.
---

# E2E 플로우 테스트 (Playwright)

규칙 원본: `.cursor/rules/e2e-flow-testing.mdc`, `.cursor/rules/testing.mdc`

## 1. 언제 적용하나

- **다단계 플로우**: 로그인 → 화면 이동 → 폼 제출 → 완료 화면 등 RTL만으로는 부족한 경로.
- **라우팅·가드**: 미인증 리다이렉트, 딥링크, `middleware` 영향.
- 사용자가 **E2E**, **플로우 테스트**, **Playwright**, **시나리오** 를 요청할 때.

## 2. 사전 확인

1. 루트에 **`playwright.config.ts`** 가 있는지 본다. 없으면 `e2e-flow-testing.mdc` §1에 따라 최소 설정을 추가하고, `pnpm add -D @playwright/test` 가 필요하면 제안한다.
2. **`e2e/`** 폴더가 없으면 생성하고, 도메인 하위 폴더로 스펙을 나눈다.
3. `package.json`에 `test:e2e` 스크립트가 없으면 추가한다.

## 3. 작업 순서 (권장)

1. **플로우를 문장으로 적는다** (시작 URL, 클릭 순서, 최종 기대 URL·문구).
2. **`e2e/<도메인>/<이름>.spec.ts`** 에 `test.describe` / `test` 로 옮긴다.
3. 로그인이 필요하면 **`storageState`** 또는 전용 `test.beforeEach` 로그인 헬퍼를 `e2e/fixtures/` 또는 `e2e/helpers/`에 둔다.
4. 로컬 검증은 **`pnpm run test:e2e`**(Playwright **UI 모드**)로 실행·확인한다. 헤드리스 일괄 실행은 CI 전용 `pnpm run test:e2e:ci`만 사용한다.

## 4. 코드 스타일

- `import { test, expect } from '@playwright/test';`
- 기본 컨텍스트: `test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3010' });` 는 **config 쪽**에 한 번만 두는 것을 권장.
- 한 `test` 안에서 **하나의 사용자 목표**만 검증하고, 단계가 길면 주석으로 구역을 나눈다.

## 5. Vitest·RTL과 역할 분담

- **RTL**: 컴포넌트·뷰 단위.
- **E2E**: 실제 브라우저·세션·전체 경로. 동일 플로우를 중복 검증하지 않도록, E2E는 **최소 한 줄기**만 잡고 세부는 RTL에 둔다.

## 6. 커뮤니케이션

- 사용자 응답은 **한국어**.
- 추가·수정한 스펙 파일 경로를 알리고, 로컬 확인은 UI 모드(`pnpm run test:e2e`)로 안내한다.
