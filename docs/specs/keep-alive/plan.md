# Keep-alive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 라우트별 opt-in 으로 스택에서 빠진 페이지를 숨긴 채 살려 두고, 같은 path 를 다시 열면 그 인스턴스(스크롤·입력값·state)를 되살린다. 스택 안 페이지의 마운트 수도 선택적으로 제한한다.

**Architecture:** 리듀서 `StackState` 에 `cached` 목록을 두고, 엔트리가 스택에서 빠질 때(전환 끝 또는 즉시) keepAlive 엔트리를 옮긴다. 되살리기는 같은 `key` 의 엔트리를 다시 스택에 올리는 것이고, Provider 는 cached 엔트리를 스택 페이지와 같은 부모·같은 key 로 계속 렌더해 React 인스턴스를 유지한다.

**Tech Stack:** React 18/19, TypeScript, Emotion, Jest + RTL(jsdom), pnpm 모노레포 (`packages/core`, 데모 `packages/browser`)

**Spec:** `docs/specs/keep-alive/design.md`

## Global Constraints

- 커밋 identity: `안승찬 <94547692+Ahnseungc@users.noreply.github.com>` (repo 로컬 config 에 설정됨, 커밋 전 `git config user.email` 확인)
- 커밋 메시지: `feat: 한글 설명` / `fix: …` / `test: …` / `docs: …`, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 브랜치: `feat/header-transition` 에 이어서 커밋 (push 는 사용자 요청 시)
- 검증 명령 (repo 루트): `pnpm test`, `pnpm lint`, `pnpm typecheck` 모두 통과해야 태스크 완료
- 기본값: `KEEP_ALIVE_LIMIT = 5`, `keepAliveLimit={0}` 은 기능 끔, `DEV_MOUNTED_PAGES_WARN = 15`, `maxMountedPages` 기본 제한 없음
- 같은 페이지 기준: `entry.path` (pathname + search) 완전 일치
- 숨김은 `visibility: hidden` + `inert` + `aria-hidden`. `display: none` · React `<Activity>` 금지
- keepAlive 아닌 라우트의 기존 동작("같은 path push = 새 엔트리")은 바뀌면 안 된다
- 상수는 `packages/core/src/constants.ts`, 공개 export 는 `packages/core/src/index.ts`

## Review Focus

1. 현재 top 이 keepAlive A 인데 `resetPush(A)` → 스택 `[root, A]`, A 인스턴스 유지, 전환 없음(Task 3 테스트)
2. keepAlive A 가 아직 스택 아래에 있는데 `push(A)` → 스택 안 A 를 끌어오지 않고 새 엔트리 생성(Task 3 테스트)
3. `keepAliveLimit={0}` → 아무것도 보관·되살리지 않고 cached 렌더 없음(Task 1·4 테스트)
4. 보관에서 쫓겨난(evict) key 로 브라우저 forward → 크래시 없이 새로 마운트(Task 3 테스트)
5. 되살린 직후 URL·`history.state.key`·스택 top 일치 (`navigation-consistency` 패턴, Task 3 테스트)

---

### Task 1: 리듀서 — 보관 목록과 보관 규칙

**Files:**
- Modify: `packages/core/src/stack-router/stack-reducer.ts`
- Test: `packages/core/src/__tests__/stack-reducer.test.ts`

**Interfaces:**
- Produces:
  - `StackEntry.keepAlive?: boolean`
  - `StackState.cached: StackEntry[]` (오래된 → 최근), `StackState.cacheLimit: number`
  - `createStackState(entry: StackEntry, cacheLimit?: number): StackState` (기본 0)
  - `PageState` 에 `"cached"` 추가
  - `getRenderedPages` 결과 순서: `cached` → (기존 순서). cached 항목은 `pageState: "cached"`, `isTop: false`

- [ ] **Step 1: 실패하는 테스트 작성** (`describe("keep-alive 보관")`, `cacheLimit` 2 로 생성, keepAlive 엔트리 헬퍼 `kept(key)`)
  - `END_TRANSITION 뒤 pop 된 keepAlive 엔트리가 cached 로 간다`: push b(kept) → END → POP_TO 0 animate → END ⇒ `state.cached.map(k)` = `["b"]`, `states()` = `["b:cached", "a:idle"]`
  - `keepAlive 아닌 엔트리는 보관하지 않는다` ⇒ `cached` = `[]`
  - `animate=false POP_TO 는 즉시 보관한다` ⇒ dispatch 직후 `cached` = `["b"]`
  - `REPLACE·RESET·RESET_PUSH 로 지워진 keepAlive 엔트리도 보관한다` (각각 1 케이스; RESET_PUSH animate 는 END 뒤)
  - `같은 path 가 다시 보관되면 오래된 쪽을 버린다`: path `/b` 두 엔트리(key 다름) 순서대로 보관 ⇒ cached 에 두 번째 key 하나
  - `상한을 넘으면 가장 오래된 보관부터 버린다`: cacheLimit 2, c·d·e 순 보관 ⇒ `["d","e"]`
  - `스택 안 keepAlive 엔트리도 상한에 포함한다`: cacheLimit 2, 스택에 kept x 하나 있고 c·d 보관 ⇒ cached `["d"]`
  - `cacheLimit 0 이면 보관하지 않는다`

- [ ] **Step 2: 실패 확인** — `pnpm --filter @ahnseungchan/webviewkit test -- stack-reducer` → 새 테스트 FAIL

- [ ] **Step 3: 구현**
  - 내부 헬퍼 `cacheEntries(state: StackState, removed: StackEntry[]): StackEntry[]` — removed 중 `keepAlive` 만 뒤에 붙이고, 같은 `path` 의 기존 항목 제거, `cacheLimit - (스택 안 keepAlive 수)` 를 넘는 앞쪽을 잘라 반환. `cacheLimit <= 0` 이면 `[]`.
  - `END_TRANSITION`: `leaving` 을 `cacheEntries` 로 보관.
  - `POP_TO` animate=false, `REPLACE`, `RESET`, `RESET_PUSH`(animate=false 는 즉시, true 는 previousTop 만 leaving 에 두고 나머지 지워진 엔트리는 즉시) 에서 지워지는 엔트리를 보관.
  - 기존 액션들은 `cached`·`cacheLimit` 를 보존한다(`RESET`/`RESTORE` 포함).

- [ ] **Step 4: 통과 확인** — 같은 명령 PASS, 기존 reducer 테스트도 PASS

- [ ] **Step 5: 커밋** — `feat: 스택 리듀서에 keep-alive 보관 목록 추가`

---

### Task 2: 리듀서 — 되살리기 액션

**Files:**
- Modify: `packages/core/src/stack-router/stack-reducer.ts`
- Test: `packages/core/src/__tests__/stack-reducer.test.ts`

**Interfaces:**
- Consumes: Task 1 의 `cached`, `cacheEntries`
- Produces:
  - 액션 `{ type: "REVIVE"; entry: StackEntry; direction: "push" | "pop"; index: number; animate: boolean }`
    - `entry` 는 cached 에 있는 key 의 엔트리(새 `data` 반영본). `index` 는 되살린 뒤 entry 의 스택 위치.
    - push: `entries = [...entries.slice(0, index), entry]` (보통 index === entries.length), 이전 top exit.
    - pop: `entries.slice(0, index)` + entry, 잘린 엔트리는 leaving(전환) 또는 즉시 보관, pop 전환.
    - 어느 쪽이든 `cached` 에서 entry.key 제거.
  - `RESET_PUSH` 에 `entry` 가 지워질 스택(`entries.slice(1)`) 또는 `cached` 의 key 와 같으면 그 엔트리를 재사용: 리듀서는 그 key 를 보관하지 않고, 지워질 엔트리 목록·cached 에서 빼서 `[root, entry]` 를 만든다. 이전 top 과 key 가 같으면 `transition: null`.
  - `findRevivable(state: StackState, path: string, opts?: { includeRemovable?: boolean }): StackEntry | undefined` (export) — `cached` 를 최근 것부터 path 로 찾고, `includeRemovable` 면 `entries.slice(1)` 중 keepAlive 도 포함(지워질 쪽 우선).

- [ ] **Step 1: 실패하는 테스트**
  - `REVIVE push 는 cached 엔트리를 같은 key 로 top 에 올린다` ⇒ `states()` = `["a:exit","b:enter"]`, `cached` = `[]`, top key === 원래 key
  - `REVIVE pop 은 아래를 자르고 pop 전환으로 되살린다`: 스택 a,c,d, cached b; REVIVE pop index 1 ⇒ entries `["a","b"]`, `states()` 에 `b:enter`, `d:exit`
  - `RESET_PUSH 가 지워질 스택 안의 keepAlive 엔트리를 재사용한다`: [a, b(kept), c] 에 entry=b ⇒ entries keys `["a","b"]`, cached 에 b 없음, c 는 exit
  - `RESET_PUSH 대상이 현재 top 이면 전환이 없다` (Review Focus 1) ⇒ `transition` null, entries `["a","b"]`
  - `findRevivable` 은 includeRemovable 일 때 스택 안 keepAlive 를 cached 보다 먼저 찾는다

- [ ] **Step 2: 실패 확인** — 같은 명령, FAIL
- [ ] **Step 3: 구현** — 위 Interfaces 그대로. `getRenderedPages` 는 cached 에서 빠진 key 가 같은 React key 로 스택 쪽에 렌더되므로 추가 처리 없음.
- [ ] **Step 4: 통과 확인**
- [ ] **Step 5: 커밋** — `feat: keep-alive 되살리기 리듀서 액션 추가`

---

### Task 3: 내비게이션 훅 — 보관·되살리기 연결

**Files:**
- Modify: `packages/core/src/stack-router/use-stack-navigation.ts`, `packages/core/src/type.ts`, `packages/core/src/constants.ts`
- Test: `packages/core/src/__tests__/keep-alive.test.tsx` (새 파일, `navigation-consistency.test.tsx` 의 `go`·`expectConsistent` 패턴을 복사)

**Interfaces:**
- Consumes: Task 2 의 `REVIVE`, `findRevivable`, `createStackState(entry, cacheLimit)`
- Produces:
  - `Activity.keepAlive?: boolean`, `StackRouterProviderProps.keepAliveLimit?: number`, `StackNavigationOptions.keepAliveLimit: number`
  - `KEEP_ALIVE_LIMIT = 5` (constants)
  - `createEntry` 가 `keepAlive: hit.activity.keepAlive === true` 기록

- [ ] **Step 1: 실패하는 통합 테스트** (`/list`(keepAlive, 카운터), `/plain`(카운터), `/detail/:id`(keepAlive), Provider 에 `keepAliveLimit` 기본)
  - `keepAlive 페이지는 back 후 다시 push 하면 state 가 유지된다`: 카운터 3회 클릭 → back → push `/list` ⇒ 카운터 텍스트 `3`, `useActivity().key` 동일
  - `keepAlive 아닌 페이지는 새로 마운트된다` ⇒ `0`
  - `params 가 다르면 되살리지 않는다`: `/detail/1` 보관 후 push `/detail/2` ⇒ 새 마운트
  - `되살린 페이지에 새 data 가 반영된다` ⇒ `useActivity().data` 새 값
  - `resetPush 대상이 지워질 스택 안 keepAlive 면 그 인스턴스를 되살린다` ([p, list(카운터 2), plain] → resetPush `/list` ⇒ `2`, entries `["/p1","/list"]`)
  - `reset 으로 지워진 keepAlive 페이지도 다음 push 에서 되살아난다`
  - `브라우저 forward 로 보관 key 에 닿으면 push 로 되살아난다` (push list → back → `history.forward()` ⇒ 카운터 유지, expectConsistent)
  - `브라우저 back 이 보관 key 에 닿으면 pop 으로 되살아난다`: push `/list`(key K, 카운터 2) → back(K 보관) → push `/plain`(key P). 그다음 history 를 직접 어긋나게 만든다:
    `history.replaceState({ key: K, index: 1, path: "/list" }, "", "/list")`, `history.pushState({ key: P, index: 2, path: "/plain" }, "", "/plain")`.
    `history.back()` ⇒ entries `["/p1","/list"]`, 카운터 `2`, expectConsistent
  - Review Focus 2: `스택 아래에 같은 keepAlive path 가 있으면 push 는 새 엔트리를 만든다`
  - Review Focus 4: `보관에서 쫓겨난 key 로 forward 하면 새로 마운트된다` (keepAliveLimit 1)
  - Review Focus 3: `keepAliveLimit 0 이면 되살리지 않는다`
  - 각 케이스 끝 `expectConsistent` (Review Focus 5)

- [ ] **Step 2: 실패 확인** — `pnpm --filter @ahnseungchan/webviewkit test -- keep-alive` FAIL
- [ ] **Step 3: 구현**
  - `push`: `findRevivable(state, path)` 가 있으면 `{...cachedEntry, data}` 로 history push(같은 key) 후 `REVIVE push`, 없으면 기존 경로.
  - `resetPush`: `findRevivable(state, path, { includeRemovable: true })` 결과 엔트리(새 data)를 `RESET_PUSH` 에 넘기고 history 도 그 key 로 push.
  - `onPop`: key 가 스택에 없고 `cached` 에 있으면 — `historyState.index === entries.length` → `REVIVE push`, `index < entries.length` → `REVIVE pop` (index = historyState.index). 아니면 기존 처리.
  - `replace`·`reset` 은 `findRevivable` 을 쓰지 않는다(항상 새 엔트리). 대상 path 의 보관본은 리듀서의 같은-path 규칙에 따라 정리된다.
  - `useReducer` 초기화에 `createStackState(rootEntry, options.keepAliveLimit)`.
- [ ] **Step 4: 통과 확인** — 새 파일 + 전체 `pnpm test` PASS
- [ ] **Step 5: 커밋** — `feat: push·resetPush·popstate 에서 keep-alive 페이지 되살리기`

---

### Task 4: Provider 렌더링과 훅 (`isCached`, `useOnRevive`)

**Files:**
- Modify: `packages/core/src/stack-router/stack-router-provider.tsx`, `_components/stack-page.tsx`, `activity-context.tsx`, `packages/core/src/index.ts`
- Test: `packages/core/src/__tests__/keep-alive.test.tsx`

**Interfaces:**
- Consumes: Task 1 `getRenderedPages` (cached 포함), Task 3 options
- Produces:
  - `ActivityContextValue.isCached: boolean`
  - `useOnRevive(callback: (data: unknown) => void): void` (`activity-context.tsx`, index 에서 export) — 같은 페이지의 `isCached` 가 true → false 로 바뀐 렌더 뒤 1회 호출, 인자 `useActivity().data`
  - Provider prop `keepAliveLimit` → `useStackNavigation` 전달 (기본 `KEEP_ALIVE_LIMIT`)
  - index export: `KEEP_ALIVE_LIMIT`, `useOnRevive`

- [ ] **Step 1: 실패하는 테스트**
  - `보관 중 페이지는 cached 상태이고 inert·aria-hidden 이다` ⇒ wrapper `data-state="cached"`, `inert` 속성, `aria-hidden="true"`
  - `보관 중 isCached 가 true, 되살아나면 false`
  - `useOnRevive 는 되살아날 때 새 data 로 한 번 호출된다` (jest.fn, 첫 마운트에는 호출 안 됨)
  - `keepAliveLimit 0 이면 cached 페이지를 렌더하지 않는다`
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — `PageWrapper` 의 `visibility` 조건을 `covered | cached` 로, `isTop` false 면 이미 inert. 렌더 루프의 `ActivityContext` value 에 `isCached: pageState === "cached"`. `useOnRevive` 는 이전 `isCached` 를 ref 로 들고 effect 에서 비교.
- [ ] **Step 4: 통과 확인** — `pnpm test`, `pnpm lint`, `pnpm typecheck`
- [ ] **Step 5: 커밋** — `feat: 보관 페이지 렌더와 isCached·useOnRevive 추가`

---

### Task 5: 스택 마운트 상한 `maxMountedPages` 와 개발 경고

**Files:**
- Modify: `packages/core/src/stack-router/stack-router-provider.tsx`, `packages/core/src/type.ts`, `packages/core/src/constants.ts`
- Test: `packages/core/src/__tests__/keep-alive.test.tsx`

**Interfaces:**
- Produces:
  - `StackRouterProviderProps.maxMountedPages?: number` (기본 undefined = 제한 없음)
  - `DEV_MOUNTED_PAGES_WARN = 15` (constants, export 안 함)
  - 규칙: 스택 엔트리 중 top 에서부터 `maxMountedPages` 개, `enter`/`exit` 상태, keepAlive 엔트리는 children 렌더. 나머지는 `StackPage` 는 그대로 두고 children 만 `null`.

- [ ] **Step 1: 실패하는 테스트**
  - `maxMountedPages 2 에서 깊이 4 의 아래쪽 일반 페이지는 언마운트된다` ⇒ p1·p2 testid 없음, p3·p4 있음
  - `back 으로 돌아오면 새로 마운트된다` ⇒ 카운터 0
  - `keepAlive 페이지는 상한 밖이어도 마운트를 유지한다`
  - `개발 모드에서 마운트 수가 15 를 넘으면 한 번 경고한다` (`process.env.NODE_ENV="development"`, console.warn spy 1회)
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — 렌더 루프에서 엔트리별 `shouldMount(entry, indexFromTop, pageState)` 계산. 경고는 `useRef` 플래그로 1회.
- [ ] **Step 4: 통과 확인** — `pnpm test`, `pnpm lint`, `pnpm typecheck`
- [ ] **Step 5: 커밋** — `feat: 스택 페이지 마운트 상한 maxMountedPages 추가`

---

### Task 6: 데모·문서

**Files:**
- Modify: `packages/browser/src/main.tsx`, `packages/browser/src/home.tsx`, `packages/browser/src/detail.tsx`, `packages/core/README.md`, `CHANGELOG.md`

- [ ] **Step 1: 데모** — `/detail/:id` 에 `keepAlive: true`, Detail 에 긴 목록(스크롤 확인용)과 입력창, Home 에 `resetPush("/detail/1")` 버튼
- [ ] **Step 2: 브라우저 확인** — `webviewkit-demo` 프리뷰에서 Detail 1 스크롤·입력 → back → Detail 1 다시 열기 ⇒ 스크롤 위치·입력값 유지 (`scrollTop`·input value 를 javascript_tool 로 측정)
- [ ] **Step 3: 문서** — README Provider props 표에 `keepAliveLimit`·`maxMountedPages`, Activity 에 `keepAlive`, Hooks 표에 `useOnRevive`·`isCached`. CHANGELOG `[Unreleased] ### Added` 에 keep-alive·maxMountedPages 한 줄씩
- [ ] **Step 4: 전체 검증** — `pnpm test && pnpm lint && pnpm typecheck && pnpm build` 모두 성공
- [ ] **Step 5: 커밋** — `docs: keep-alive 데모와 문서 추가`
