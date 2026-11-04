# 기술 스펙 — WebViewKit 2.0.0

| 항목 | 값 |
|------|-----|
| 근거 | [PRD](../../prd/webviewkit-v2-prd.md) §4~§7, §11 검증 결과 |
| 대상 버전 | `@ahnseungchan/webviewkit@2.0.0` (Breaking) |
| 작성일 | 2026-11-04 |

## 0. 범위

이번 2.0.0에서 구현한다:

| 영역 | PRD ID |
|------|--------|
| 저장소·빌드 | E-50, E-51, E-52, E-53, E-54, E-55, E-56, E-57, E-58, E-59 |
| 스택 라우터 | E-01~E-13, E-15~E-21 · F-02, F-03, F-04, F-05, F-08(`ignore`), F-11(`slide`/`fade`/`none`), F-12 · I-01~I-06 |
| 브릿지 | E-30~E-40 · F-01, F-06, F-07 |

이번에는 하지 않는다(2.x 후속): F-09 라이프사이클 훅, F-10 스와이프 제스처, F-13 keepAlive·스크롤 복원, F-14 Emotion 제거, F-15~F-18, E-14(메모리 맵 data 저장), E-22 하이드레이션 고도화, E-41 핸드셰이크, E-60(`.cursor` 정리는 소유자가 판단).

---

## 1. 저장소 · 빌드

| 항목 | 변경 |
|------|------|
| node_modules | `git rm -r --cached`로 추적 해제. `.gitignore`는 이미 `node_modules/`를 포함한다 |
| dist | `!packages/core/dist/` 예외를 제거하고 추적을 해제한다. 배포 시 `prepublishOnly`로 빌드한다 |
| 빌드 | `tsup`로 `dist/index.mjs`(ESM) + `dist/index.js`(CJS) + `dist/index.d.ts`를 만든다. react·emotion은 external |
| package.json | `exports` 맵(`types` / `import` / `require`), `module`, `sideEffects: false` 유지(모듈 import 시 전역 부작용 없음, §2.1) |
| peer | `react`·`react-dom >=18`, emotion `>=11` |
| 전역 타입 | `bridge/window.d.ts` → `bridge/globals.ts`(`declare global`). index에서 타입이 dts에 포함된다 |
| lint | ESLint 9 flat config. `typescript-eslint`, `eslint-plugin-simple-import-sort` 추가. 스크립트 `eslint src` |
| jest | `testMatch: **/__tests__/**/*.test.ts(x)`, deprecated `globals`·`babelConfig` 제거 |
| CI | `.github/workflows/ci.yml` — push·PR에서 lint → typecheck → test → build. `publish.yml`에 lint·build 추가 |
| 데모 | `packages/browser`는 vite alias로 core `src`를 참조. `build: vite build`, 깨진 tsup·test 스크립트 제거 |

---

## 2. 스택 라우터

### 2.1 history 래퍼 (`history.ts`)

- `popstate` 리스너는 **첫 `addListener` 때 등록**하고, 마지막 리스너가 해제되면 제거한다. 모듈 import 시점의 부작용을 없앤다.
- `push`·`replace`는 동기적으로 실행하고 `void`를 반환한다. 인위적인 지연(`STACK_TRANSITION_MS * 0.6`)을 제거한다(I-05).
- 리스너는 **브라우저 `popstate`일 때만** 호출된다. `push`/`replace`는 리스너를 호출하지 않는다. 라우터가 직접 상태를 바꾸기 때문이다(E-11 단일화).
- `back()`은 `Promise<boolean>`이다. popstate가 오면 `true`, `BACK_TIMEOUT_MS`(1000) 안에 오지 않으면 리스너를 정리하고 `false`(E-12).
- history state 형태:

```ts
interface HistoryState {
  path: string;          // pathname + search
  data?: unknown;
  action?: HistoryAction;
  key?: string;          // 스택 엔트리 고유 key
  index?: number;        // 스택 내 위치 (0 = root)
}
```

### 2.2 경로 매칭 (`stack-router/match-path.ts`)

- `matchPath(pattern, url)` → `{ params, query } | null`
- 패턴 세그먼트 `:name`은 한 세그먼트에 매칭되고 `decodeURIComponent` 한다. 나머지 세그먼트는 정확히 일치해야 한다. 끝의 `/`는 무시한다.
- `?a=1&b=2`는 `query: Record<string, string>`으로 분리한다. `#hash`는 무시한다.
- `findActivity(activities, url)`: 등록 순서대로 첫 매칭을 반환한다.

### 2.3 상태 모델 (`stack-router/stack-reducer.ts`)

```ts
interface StackEntry {
  key: string;              // 고유 (push마다 새로 발급)
  path: string;             // 실제 URL (pathname + search)
  pattern: string;          // Activity path
  params: Record<string, string>;
  query: Record<string, string>;
  data?: unknown;
}

type Transition =
  | { type: "push"; enterKey: string; exitKey: string }
  | { type: "pop"; enterKey: string; exitKeys: string[] }
  | null;

interface StackState {
  entries: StackEntry[];    // 현재 스택 (root → top)
  leaving: StackEntry[];    // pop 애니메이션 중인 엔트리 (애니 종료 후 제거)
  transition: Transition;
}
```

| 액션 | 동작 |
|------|------|
| `PUSH(entry)` | entries 끝에 추가. transition = push(enter=새 top, exit=이전 top) |
| `REPLACE(entry)` | top 교체, transition 없음 |
| `POP_TO(index)` | `index+1` 이후 엔트리를 `leaving`으로 이동. transition = pop(enter=새 top, exit=leaving) |
| `RESET(entry)` | entries = [entry], leaving = [], transition 없음 |
| `RESTORE(entries)` | 초기 복원(§2.6) |
| `END_TRANSITION` | transition = null, leaving = [] |

### 2.4 렌더 · 전환

각 페이지 래퍼는 `data-state`를 가진다:

| data-state | 조건 | 스타일 |
|------------|------|--------|
| `enter` | push의 새 top / pop의 새 top | push: 100%→0 + 그림자, pop: -30%→0 + dim 1→0 |
| `exit` | push의 이전 top / pop의 leaving | push: 0→-30% + dim 0→1, pop: 0→100% + 그림자 |
| `idle` | 현재 top, 전환 없음 | 애니메이션 없음 |
| `covered` | top이 아니고 전환 대상도 아님 | `visibility: hidden` |

- top이 아닌 래퍼는 `inert`·`aria-hidden="true"`를 받는다(E-19).
- 전환 종료: enter 래퍼의 `animationend` 또는 안전 타이머 `duration + 50ms` 중 먼저 오는 쪽에서 `END_TRANSITION`. 언마운트 시 타이머를 정리한다(E-13).
- `transition` prop: `"slide"`(기본) / `"fade"` / `"none"`. `prefers-reduced-motion: reduce`이거나 `"none"`이면 duration은 0이고 즉시 종료한다(E-20).
- React key는 `entry.key`다. 재정렬·리마운트가 없다(E-09).
- 레이아웃 높이는 `100vh` 다음에 `100dvh`를 선언한다. `safeArea` prop이 true면 `env(safe-area-inset-*)` padding을 적용한다(E-17). `user-select: none`·`cursor: grab`은 제거한다(E-18).

### 2.5 내비게이션 API

`useStackRouter()` 반환값:

| 멤버 | 동작 |
|------|------|
| `push(path, data?)` | 전환 중이면 `false`(E-07). 매칭 실패 시 dev 경고 + `onNotFound?.(path)`, URL은 바꾸지 않고 `false`(E-08). 성공하면 `pushState({key,index,...})` 후 `PUSH`, `true` |
| `replace(path, data?)` | 매칭 → `replaceState` + `REPLACE`(E-10) |
| `back()` | 전환 중이면 `false`. depth ≤ 1이면 `onBackAtRoot?.()` 호출 후 `false`, history는 건드리지 않는다(E-05). 아니면 `history.go(-1)`. 실제 pop은 popstate 핸들러가 처리한다(E-03·E-11 단일 경로) |
| `pop(n = 1)` | `history.go(-min(n, depth-1))` |
| `popTo(path)` | 스택에서 가장 위에 있는 해당 path 엔트리까지 pop. 없으면 `false` |
| `reset(path, data?)` | `replaceState(index 0)` + `RESET` |
| `canGoBack` | depth > 1 |
| `depth`, `currentPath`, `currentState`, `visiblePages`, `Activities`, `initialActivity` | 1.x 호환 필드. `currentState`는 top 엔트리의 `HistoryState` |
| `forward()` | **deprecated**, `history.forward()`를 그대로 호출 |

**popstate 처리**:

1. `state.key`가 현재 entries에 있으면 → 그 index로 `POP_TO`(브라우저·하드웨어 back, E-03).
2. 없고 `state.index > top index`이면(브라우저 forward) → URL 매칭 후 `PUSH`.
3. 그 밖(이전 reset 이전 엔트리 등) → URL 매칭 후 `RESET`. 매칭이 안 되면 `onNotFound`.

### 2.6 초기화 · 복원 (E-04, E-06, F-05)

- `initialActivity`는 **마운트 시 1회만** 읽는다. 이후 prop이 바뀌어도 스택을 리셋하지 않는다.
- 마운트 effect에서 `location.pathname + search`를 확인한다:
  - initial path와 같거나 매칭 Activity가 없으면 → `replaceState(root, index 0)`
  - 다르고 매칭되면, `restoreStack`에 따라:
    - `"with-root"`(기본): `replaceState(root, index 0)` → `pushState(matched, index 1)` → entries `[root, matched]`. back 하면 root로 돌아간다
    - `"top-only"`: `replaceState(matched, index 0)` → entries `[matched]`
- SSR 첫 렌더는 항상 `[initialActivity]`이고, 복원은 effect에서만 한다.

### 2.7 페이지 컨텍스트 (F-04, E-16)

```ts
const { key, path, params, query, data, index, isTop } = useActivity();
const params = useParams<{ id: string }>();
```

각 페이지 래퍼가 자기 엔트리로 `ActivityContext`를 제공한다.

### 2.8 Props

```ts
interface StackRouterProviderProps {
  initialActivity: Activity;
  Activities?: Activity[];
  maxWidth?: string;                 // "600px"
  isShowHeader?: boolean;            // true면 StackHeader 렌더 (E-21)
  enableDevTools?: boolean;
  transition?: "slide" | "fade" | "none";
  duration?: number;                 // STACK_TRANSITION_MS (300)
  restoreStack?: "with-root" | "top-only";
  safeArea?: boolean;
  onBackAtRoot?: () => void;
  onNotFound?: (path: string) => void;
  /** 네이티브 브릿지 연동 (§3.6) */
  bridge?: boolean | StackBridgeSyncOptions;
}
```

`STACK_TRANSITION_MS`는 500이다. `slide`는 iOS UINavigationController를 따른다: 감속 곡선 `cubic-bezier(0.32, 0.72, 0, 1)`, 아래 페이지 -30% 패럴랙스 + 검은 dim(`::after`), 위 페이지 왼쪽 가장자리 그림자. 페이지 자체 opacity는 바꾸지 않는다.

---

## 3. 브릿지

### 3.1 프로토콜 확장 (v1 호환)

envelope에 선택 필드를 추가한다. 기존 필드 의미는 그대로다.

```ts
type BridgeEnvelope<T = unknown> = {
  v: 1; ns: "webviewkit"; id: string; method: string;
  payload?: T;
  error?: { code: BridgeErrorCode; message: string };
  replyTo?: string;       // 응답일 때 원 요청 id
};
```

| method | 방향 | payload |
|--------|------|---------|
| `stack.push` / `stack.replace` / `stack.reset` | 양방향 | `{ url, meta? }` |
| `stack.pop` | 양방향 | 없음 |
| `stack.changed` | web → native | `{ depth, path }` |
| `back.request` | native → web | 없음 → 응답 `{ handled: boolean }` |
| `bridge.response` | 양방향 | 요청에 대한 응답. `replyTo` 필수 |

### 3.2 에러 (`bridge/errors.ts`)

```ts
const BRIDGE_ERROR_CODES = {
  TIMEOUT, BRIDGE_UNAVAILABLE, INVALID_PAYLOAD,
  URL_NOT_ALLOWED, UNKNOWN_METHOD, HANDLER_ERROR,
} as const;
class BridgeError extends Error { code: BridgeErrorCode }
```

### 3.3 URL 검증 (E-31, F-07)

- `isSafeStackUrl(url)`: 기본 정책은 `/`로 시작하고 `//`로 시작하지 않는 상대 경로만 허용. 같은 origin의 절대 http(s) URL은 pathname+search+hash로 정규화해서 허용한다.
- `allowUrl?: (url) => boolean`로 정책을 교체할 수 있다.
- inbound(`stack.*` envelope, `window.stackPush` 등)와 outbound(`client.stackPush`) 모두 검증한다. inbound 위반 시 핸들러를 호출하지 않고 `false` + `onError(URL_NOT_ALLOWED)`. outbound 위반 시 `BridgeError(URL_NOT_ALLOWED)` reject.
- payload 검증(E-37): `url`이 비어 있지 않은 문자열이 아니면 `INVALID_PAYLOAD`.

### 3.4 클라이언트 (E-32, E-38, F-06)

```ts
client.request(method, payload?, { timeoutMs?: number; expectResponse?: boolean })
  : Promise<BridgeResult>
type BridgeResult<R = unknown> = { envelope: BridgeEnvelope; result?: R };
```

- Flutter: `callHandler`의 반환값을 `result`에 담는다. `timeoutMs`(기본 `BRIDGE_TIMEOUT_MS` = 5000) 안에 끝나지 않으면 `TIMEOUT`.
- RN: `postMessage` 후, `expectResponse: true`일 때만 `replyTo === id`인 `bridge.response` ingress를 기다린다(pending map). 기본은 `false`라 전송 즉시 resolve(1.x 네이티브와 호환).
- 전송이 throw하면 `BRIDGE_UNAVAILABLE`. browser 호스트에서는 아무것도 하지 않고 resolve.
- 응답 envelope에 `error`가 있으면 그 code로 reject.
- `stackReset(url, meta)`는 meta를 전달한다(E-36).

### 3.5 호스트 감지 · 설치 (E-30, E-34, E-35, E-39, E-40)

- `waitForBridgeHost({ timeoutMs = 3000 })`: 즉시 감지되면 resolve. 아니면 `flutterInAppWebViewPlatformReady` 이벤트와 100ms 폴링으로 재감지. 타임아웃 시 `"browser"`.
- `WebViewBridgeProvider`:
  - `stack`·`hostOptions`는 ref로 보관한다. 설치 effect는 `enableOutboundBridge`에만 의존한다(인라인 객체여도 1회 설치).
  - outbound 브릿지는 마운트 시 바로 감지되지 않으면 `waitForBridgeHost` 이후에 설치한다.
- `installBridgeHost`: 설치한 함수 참조를 기억한다. cleanup은 **전역이 아직 자기 것일 때만** delete한다. 덮어쓸 때 dev 경고를 낸다.
- `exposeStackRouterBridge: true`면 `createStackRouterBridge()`로 생성해서 설치한다.
- `getStackRouterBridge()`: `window.stackRouterBridge` → 모듈 캐시 → 새로 생성 후 캐시.
- inbound 처리(`dispatchEnvelope`)는 try/catch로 감싼다. 에러 시 `onError(BridgeError)`를 호출하고 `false`를 반환한다(unhandled rejection 없음, E-33). 요청에 `replyToNative: true`면 `bridge.response`(`replyTo`, `payload: { handled }` 또는 `error`)를 네이티브로 회신한다.
- `bridge.response` ingress는 pending map으로 라우팅한다(§3.4).

### 3.6 라우터 연동 (F-01, F-02, E-42)

`<StackRouterProvider bridge>`:

- native → web `stack.push|replace|reset|pop`을 라우터 `push|replace|reset|back`에 연결한다.
- native → web `back.request` → `canGoBack`이면 `back()` 후 `{ handled: true }`, 아니면 `onBackAtRoot?.()` 후 `{ handled: false }`. 이 응답은 항상 회신한다(네이티브가 앱 종료를 판단하는 근거).
- web → native: entries가 바뀔 때마다 `stack.changed { depth, path }`를 전송한다(browser면 no-op).
- 옵션: `{ allowUrl?, onError?, emitStackChanged?: boolean (default true) }`.

---

## 4. 호환성 · 마이그레이션 (1.x → 2.0)

| 변경 | 1.x | 2.0 |
|------|-----|-----|
| `history.push/replace` 반환 | `Promise<void>` (지연 후 notify) | `void`, 리스너 호출 없음 |
| `history.back` 반환 | `Promise<void>` (무한 대기 가능) | `Promise<boolean>` |
| `client.request`/`stackPush` 등 반환 | `Promise<BridgeEnvelope>` | `Promise<BridgeResult>` (`.envelope`) |
| `StackRouterBridge.reset` | `(url)` | `(url, meta?)` |
| `push` 같은 path 재호출 | 기존 페이지를 꺼내 top으로 이동 | 항상 새 엔트리 (`popTo`로 기존 페이지 복귀) |
| `push` 반환 | `void` | `boolean` |
| `STACK_TRANSITION_MS` | 500 | 300 (`duration` prop으로 조정) |
| peer react | `>=16.8` | `>=18` |
| 모듈 | CJS | ESM + CJS (`exports`) |

## 5. 테스트 계획

| 파일 | 검증 |
|------|------|
| `history.test.ts` | 지연 등록·해제, push/replace가 리스너를 호출하지 않음, back 타임아웃 `false` |
| `match-path.test.ts` | 정적·동적·쿼리·trailing slash·미매칭 |
| `stack-reducer.test.ts` | 액션별 상태 전이 |
| `stack-router.test.tsx` | PRD §7 스택 수용 기준 전부(E-01~E-10 회귀), `useActivity`/`useParams`, 딥링크 복원 2정책, reduced-motion/`none` |
| `bridge.protocol.test.ts` | 기존 + `isSafeStackUrl` |
| `bridge.host.test.ts` | 기존 + E-31, E-33, E-35, E-37, E-39, E-40, response 회신 |
| `bridge.client.test.ts` | Flutter result·TIMEOUT, RN expectResponse 매칭·전송 실패 `BRIDGE_UNAVAILABLE`, reset meta |
| `bridge.provider.test.tsx` | 인라인 stack 1회 설치(E-34), 늦은 Flutter 주입(E-30) |
| `stack-bridge-sync.test.tsx` | native push → 스택 반영, `back.request` handled true/false, `stack.changed` 전송 |

완료 조건: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` 통과, 데모 `vite build` 통과.

## 6. 릴리스

1. `packages/core/package.json` version `2.0.0`, CHANGELOG `## [2.0.0]`
2. main 커밋·푸시 → `v2.0.0` 태그 푸시 → `publish.yml`이 npm Trusted Publishing으로 배포 + GitHub Release 생성
