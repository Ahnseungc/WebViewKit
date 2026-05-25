---
name: goldie-front
description: >-
  Applies Goldie B2C frontend conventions: TDD-first workflow (Red-Green-Refactor),
  Korean commit messages, FSD-style layers, Tailwind v4 tokens, Auth.js env,
  TanStack prefetch/hydrate, SSR/ISR/Streaming SSR, ISR·SSG caveats, Vitest/Playwright, DS boundaries.
  For new or changed user-visible UI, also follow ui-with-rtl-tests (co-located RTL tests).
  For multi-step browser flows, follow e2e-flow-playwright (Playwright under e2e/).
  For fixed bottom CTAs in app WebView, read webview-bottom-cta skill and webview-bottom-cta.mdc rule.
  For GitHub PR titles/bodies, follow github-pr-description skill and github-pr-description.mdc rule.
  Use when implementing features, fixing bugs, writing tests, or when the user
  mentions 골디, TDD, Vitest, Playwright, E2E, e2e, 플로우 테스트, UI 구현, RTL, Testing Library,
  WebView, 하단 버튼, safe area, 바텀시트, PR, 풀리퀘스트, pull request.
  API 연동, API 스키마 변경, SSR prefetch, HydrationBoundary, dehydrate.
---

# Goldie 프론트 — 에이전트 규칙 요약

저장소 전체 규칙은 `.cursorrules`와 `.cursor/rules/*.mdc`가 원본이다. 이 스킬은 **에이전트가 매번 지켜야 할 것만** 압축한다.

## API 작업 필수

- API 관련 작업(서비스/훅/페이지 prefetch 변경 포함)은 **항상** `.cursor/rules/state-data-management.mdc`와 본 스킬의 React Query 절을 함께 확인한다.
- 시작 전 체크: `page.tsx`(Server) 진입 여부, `prefetchQuery + dehydrate` 적용 여부, 클라이언트 훅의 query key 정합 여부.
- 스펙 문서(`app/.../_src/specs/*.md`, `docs/specs/**/*.md`) 기반 API 구현은 **테스트 코드 작성이 필수**다. 구현 전에 계약(요청/응답/예외) 테스트 케이스를 먼저 정의한다.
- API 구현 시 테스트 기준 문서인 `.cursor/rules/testing.mdc`를 반드시 함께 확인하고, 서비스/훅/매퍼 중 변경된 계층에 맞춰 `*.test.ts` 또는 `*.test.tsx`를 동반 추가·갱신한다.
- **POST 계열 원칙**: `POST`/`PUT`/`PATCH`/`DELETE`는 컴포넌트에서 서비스를 직접 호출하지 않고, `hooks/**`의 `useMutation` 훅(`mutate`/`mutateAsync`)으로만 실행한다.

## 커뮤니케이션

- 사용자에게 보내는 설명은 **한국어**로 한다.
- 변경 이유·수정 파일 경로를 짧게 명시한다.

## PR 본문

- `.cursor/skills/github-pr-description/SKILL.md` · `.cursor/rules/github-pr-description.mdc` · `.github/pull_request_template.md` 를 따른다.
- `gh pr create` 시 **`--body-file`** 로 실제 줄바꿈 마크다운을 넘긴다(리터럴 `\n` 문자열 금지).

## 커밋 메시지

형식: `<type>: <한글 설명>` (필요 시 본문 한 줄 더)

타입: `feat` `fix` `docs` `style` `refactor` `test` `chore`

예: `feat: 알림 목록 무한 스크롤 추가`, `fix: 세션 조회 시 500 오류 수정`

## 기술 스택 (전제)

- Next.js 15 App Router, React 19, TypeScript 5
- Tailwind CSS v4, Radix, `cn()` (`lib/utils.ts`)
- TanStack Query v5, Zustand, React Hook Form + Zod
- NextAuth / Auth.js v5, Axios (`lib/axios.ts`), Sentry
- **테스트**: Vitest(단위·통합), Playwright(E2E), Storybook(시각화·옵션 테스트 애드온)

## 테스트 (Vitest / Playwright)

- **러너**: 단위·통합은 **Vitest** (`pnpm test`, `pnpm test:watch`, `pnpm test:coverage`). 브라우저 시나리오는 **Playwright**. 공통 설정은 `vitest.config.ts` (`setupFiles`, `@/` alias 등).
- **API 구현 필수 규칙**: 스펙 기반 API 작업은 테스트 없는 구현을 완료로 간주하지 않는다. 최소한 서비스 레벨(응답 파싱/계약 검증)과 훅 또는 호출부 레벨 중 1곳 이상에 회귀 테스트를 추가한다.
- **파일 위치**: 테스트는 **대상과 같은 디렉터리** 또는 **`__test__/`** 아래. 파일명은 **`*.test.ts` / `*.test.tsx` 권장** (`*.spec.*` 도 가능).
- **예**: `utils/foo.ts` → `utils/foo.test.ts`, `hooks/useX.ts` → `hooks/__test__/useX.test.ts`.
- **Mock**: `vi.mock("모듈")` + `vi.mocked()`로 타입 보정. Axios/fetch·`next-auth`·`next/navigation` 등은 모킹으로 격리. 픽스처는 `__test__/fixtures/` 또는 도메인 `__mocks__/`.
- **컴포넌트**: `@testing-library/react` — **역할·라벨** 기반 쿼리(`getByRole`, `getByLabelText`) 우선. `components/ds/`는 **수정하지 않고** import해 검증하거나 스냅샷·시맨틱 쿼리로만 다룬다.
- **스타일**: `describe` / `it`에 **한글 설명 가능**. **한 `it`당 기대 하나**. 공통 `beforeEach`는 setup 또는 파일 상단.
- **커밋**: 테스트만 바꿀 때 타입 `test:` (`test: formatPhoneNumber 단위 테스트 추가`).

## UI 구현 + RTL (동반 테스트)

- **피그마 → 코드**: 예시 문자열(`HH:MM` 등)을 **데이터 없이** 그대로 노출하지 않는다. **`.cursor/rules/figma-placeholder-user-visible.mdc`**.
- 새 **페이지·뷰·위젯**이거나 사용자에게 보이는 **문구·분기·클릭 동작**을 바꿀 때: **`.cursor/skills/ui-with-rtl-tests/SKILL.md`** 를 읽고, 구현 파일과 같은 폴더에 **`*.test.tsx`** 를 추가·갱신한다.
- 상세 규칙: **`.cursor/rules/ui-testing.mdc`**.

## WebView·하단 고정 CTA

- **`fixed` / `sticky` 하단**에 DS `Button`·퍼널 푸터·바텀시트 액션을 둘 때: **`.cursor/skills/webview-bottom-cta/SKILL.md`** 를 읽고, **`.cursor/rules/webview-bottom-cta.mdc`** 체크리스트를 맞춘다 (safe area, `device-max-width`, 본문 `pb`, `BottomFloatingContainer` 우선).

## E2E 플로우 (Playwright)

- **다단계·세션·리다이렉트**가 핵심인 플로우는 **`e2e/**/*.spec.ts`** 로 자동화한다. **`.cursor/skills/e2e-flow-playwright/SKILL.md`** 및 **`.cursor/rules/e2e-flow-testing.mdc`** 를 따른다.
- Vitest RTL과 역할이 겹치지 않게: E2E는 **크리티컬 경로 한 줄기**, 세부 검증은 RTL에 둔다.

## 작업 흐름 (TDD 기본)

- **기본 순서**: **Red → Green → Refactor**. 새 동작·버그 수정 시 **실패하는 테스트를 먼저** 추가한다(스펙·회귀를 한 `it` 또는 소규모 `describe` 단위로).
- **Red**: 아직 없는 구현이므로 **의도된 실패**가 나와야 한다. 컴파일만 깨지는 “빈 실패”는 피하고, 검증할 입력·출력을 명시한다.
- **Green**: **테스트를 통과하는 최소 변경**만 한다. 범위 밖 리팩터는 하지 않는다.
- **Refactor**: 동작은 유지한 채 구조·가독성·중복 제거 — **테스트 다시 돌려 통과 확인** 후 다음 단계.
- **범위**: 순수 로직·훅·유틸·서비스 가공은 **Vitest로 TDD**가 적합하다. UI는 RTL로 상호작용·표시를 검증하고, **핵심 사용자 여정**만 Playwright로 Red→Green 할 수 있다. RSC·레이아웃만 있는 경우에는 **서버 전용 함수·`*Server` 서비스**에 단위 테스트를 두고 페이지는 얇게 유지한다.
- **사용자가 “구현만” 요청해도**, 회귀 방지를 위해 **가능하면 테스트를 함께** 추가하거나 기존 테스트를 먼저 보강한다.

## 아키텍처·의존성

- **렌더링 기본**: **SSR** + **Streaming SSR**(App Router RSC, `Suspense`·`loading.tsx`로 세그먼트 스트리밍). 공개·준정적 구간은 **ISR**(`revalidate`) 검토. 상세·주의는 `project-architecture.mdc` 의 「App Layer — SSR / ISR / Streaming SSR」.
- FSD 방향: **바깥 계층만 안쪽 참조** (`app` → `widgets` → `features` → `entities` → `shared`). 같은 계층 간 참조 지양.
- 라우트·기능 근처 **컬로케이션** (`app/(protected)/.../_src/`, `_components/` 등). **신규 화면은 `containers/`가 아니라 `app`·features·widgets**를 우선한다.
- **기능 스펙**은 단일 라우트에 대응하면 **`app/.../_src/specs/README.md`** 에 두고, 그 외는 `docs/specs/<slug>/` (`.cursor/rules/docs-spec-fsd-route-colocation.mdc`, 스킬 `spec-docs-fsd-colocation`).
- `page.tsx`·`layout.tsx`는 가급적 **Server Component**; 인터랙션·훅이 필요한 **최소 단위**만 `'use client'`.
- **Suspense 위치**: RSC `page.tsx` / `layout.tsx` **최상단**에서 라우트 전체를 `<Suspense>`로 감싸지 않는다. 세그먼트 스트리밍은 **`loading.tsx`** 또는 `useSearchParams`·`React.lazy` 등이 있는 **클라이언트 컨테이너 내부**의 최소 경계에 `<Suspense>`를 둔다(`HydrationBoundary`만 있는 페이지는 그대로 유지).
- **한 파일 한 컴포넌트(export)**·**로직 vs UI 분리**·**TSX ~300줄**: `.cursor/rules/component-one-per-file.mdc`, `logic-ui-separation.mdc`, `component-max-lines.mdc`, 스킬 **`.cursor/skills/react-one-component-logic-ui/SKILL.md`**.
- **토스트**: `success` / `error` (`useToast`) — `toast-useToast-success-error.mdc`, 스킬 **`.cursor/skills/use-toast-success-error/SKILL.md`**.
- 값/컴포넌트 **다분기**는 `@/utils/switchCase`의 `SwitchCase` / `SwitchCaseFunction` 활용.

## SSG / ISR / 동적 경계

- **SSG(빌드 타임 경로)**: 동적 세그먼트라면 `generateStaticParams()`로 프리렌더할 `params` 목록을 반환한다. 빌드에 포함하지 않을 때는 `[]` 반환 등으로 스킵 가능(예: `app/(public)/notice/[id]/page.tsx` + 토큰 없으면 빈 배열).
- **ISR**: 라우트 세그먼트에 `export const revalidate = <초>` 로 시간 기반 재검증을 줄 수 있다.
- **이 레포 주의**: `auth()`, `headers()`, `cookies()`, `searchParams` 등 **동적 서버 API**와 ISR용 `revalidate`를 함께 쓰면 프로덕션에서 **`DYNAMIC_SERVER_USAGE`** 가 날 수 있다. 그래서 인증 레이아웃·`auth()` 사용 공지 상세 등은 `export const dynamic = 'force-dynamic'`을 두는 경우가 많다. ISR/SSG를 넣기 전 **동적 경계와 충돌 여부**를 확인한다.
- **정적 우선 예**: 공개 홈 등은 `force-static` 가능한 곳만 사용(`app/(home)/page.tsx` 참고).

## React Query — 서버 프리패치·하이드레이션

- **흐름**: Server Component `page.tsx`에서 `getQueryClient()` → `await queryClient.prefetchQuery({ queryKey, queryFn, staleTime? })` → 자식을 `<HydrationBoundary state={dehydrate(queryClient)}>` 로 감싼다.
- **서버 `QueryClient`**: `getQueryClient()`는 **서버에서는 요청마다 새 인스턴스**를 반환한다(`lib/tanstack/getQueryClient.ts`). 클라이언트는 싱글톤 재사용.
- **queryFn 규칙 (RSC)**: 프리패치에는 **직렬화 가능한 결과**만 넣는다. RSC에서 **클라이언트 Axios 기본 `queryFn`을 그대로 쓰지 않는다** — `*Server` 전용 서비스로 조회하거나, 이미 RSC에서 받은 데이터는 `queryFn: () => Promise.resolve(data)` 로 캐시에 싣는다(예: `notice/[id]/page.tsx` 주석).
- **클라이언트**: 하위 컴포넌트는 **`lib/query-keys.ts`의 동일한 `queryKey`** 로 `useQuery`를 쓰면 하이드레이션된 캐시를 그대로 사용한다.
- **Prefetch 진입점**: 페이지·레이아웃(Server)에서만 `prefetchQuery` + `dehydrate`를 수행하고, 필요 시 자식에 `dehydratedState`만 넘겨 `HydrationBoundary`를 한 번 더 감싼다(규칙: `state-data-management.mdc`).
- **중요**: `View`(UI) 컴포넌트에서 초기 진입용 API 훅을 직접 호출하지 않는다. 서버 prefetch를 누락하면 SSR 이점이 사라지고 첫 페인트 이후 재요청이 발생한다.
- **실무 체크(금거래소 포함)**: 인증 기반 라우트는 `auth()` 사용 시 `dynamic = "force-dynamic"` 여부를 확인하고, 메인 API + 분리 API(예: 상품/골디캐시) 조합이 필요하면 `page.tsx`의 단일 prefetch queryFn에서 합성한 뒤 하이드레이션한다.

## 디자인 시스템·스타일

- **색**: `styles/color.css` 시맨틱 토큰만 (`text-text-default`, `bg-bg-default`, `border-line-default` 등). **임의 Hex 금지**.
- **타이포**: `styles/typography.css` 유틸 (`text-b2-regular`, `text-t2-bold` 등).
- **라디우스**: `styles/radius.css` (`rounded-80` 등).
- **버튼·팝업**: `components/ds/button/`, `components/ds/popup/` 우선. **`components/ds/`는 사용자가 직접 수정 요청하지 않는 한 변경하지 않는다** — 래핑·상위에서 스타일 주입.
- 이미지: **`next/image`** 원칙. SVG 아이콘은 **`components/svgIcons/`** 도메인 폴더에 컴포넌트로 둔다.

## 데이터·상태

- Query key는 **`lib/query-keys.ts`** 에 정의.
- API 호출은 **`services/`**, 컴포넌트에서는 가능하면 **`hooks/`** 래핑 훅 사용.
- 서버 데이터는 TanStack Query, UI 전역 상태는 Zustand로 분리.
- RSC에서의 **프리패치·`HydrationBoundary`** 는 위 **「React Query — 서버 프리패치·하이드레이션」** 절을 따른다.

## Auth·환경변수 (자주 나는 실수)

- **Auth.js**: `AUTH_SECRET` 필수(충분한 길이의 랜덤 문자열). `.env`에는 **따옴표로 감싸지 않는 것**이 안전(주석에도 명시됨).
- Docker·nginx·리버스 프록시 뒤: **`AUTH_TRUST_HOST=true`** (문자열 `true`). URL만 넣는 것은 Auth.js 배포 가이드와 어긋날 수 있다.
- `NEXTAUTH_URL` / 공개 URL은 배포 환경과 일치시킨다.

## 작업 방식

- 기능·수정 작업은 위 **「작업 흐름 (TDD 기본)」** 을 기본으로 한다.
- TSX/JSX를 수정할 때는 **반드시** `.cursor/skills/react-one-component-logic-ui/SKILL.md` 체크리스트(특히 300줄 확인)를 먼저 수행한다.
- 요청 범위 밖 **드라이브 바이 리팩터·무관 파일 수정 금지**.
- `console.log`는 배포 코드에 남기지 않는다.
- 상세: `.cursor/rules/code-style.mdc`, `component-one-per-file.mdc`, `logic-ui-separation.mdc`, `component-max-lines.mdc`, `toast-useToast-success-error.mdc`, `design-system.mdc`, `project-architecture.mdc`, `state-data-management.mdc`, `commit-convention.mdc`, `testing.mdc`, `ui-testing.mdc`, `e2e-flow-testing.mdc` 참고.
