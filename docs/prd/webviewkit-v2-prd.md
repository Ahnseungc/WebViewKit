# PRD — WebViewKit v2 (안정화 · 기능 확장 · 오류 케이스 정리)

| 항목 | 값 |
|------|-----|
| 대상 | `@ahnseungchan/webviewkit` (packages/core) · `@webviewkit/browser` (데모) |
| 기준 커밋 | `ac473cbe` (v1.3.0, Native Bridge Protocol v1) |
| 작성일 | 2026-11-04 |
| 작성 근거 | 소스 전체 리뷰 + `pnpm test` / `pnpm lint` / `tsc` / 데모 `vite build` 실행 결과 |

---

## 1. 배경

WebViewKit은 React WebView 하이브리드 앱에서 네이티브 같은 스택 push/back 전환(`StackRouterProvider`)과 RN·Flutter 브릿지(`WebViewBridgeProvider`)를 제공한다.

v1.3.0 기준 현재 상태:

- 테스트 27개는 모두 통과한다. 그런데 테스트는 DOM 존재 여부만 확인하고 애니메이션 상태·화면 노출·URL 동기화는 검증하지 않는다. 그래서 아래 §4의 치명 버그가 테스트에 걸리지 않는다.
- `pnpm lint`는 실행 자체가 실패한다.
- 실제 WebView에서 자주 일어나는 시나리오(하드웨어 뒤로가기, 새로고침, 딥링크, 연타)를 처리하지 못한다.
- 스택 라우터와 브릿지가 서로 연결되어 있지 않다. 네이티브 스택과 웹 스택 깊이를 맞추는 일은 사용자가 직접 해야 한다.

## 2. 목표 / 비목표

### 목표

1. **G1 정확성**: push/back/replace/popstate 어떤 경로로 이동해도 `visiblePages`, URL, 화면이 항상 일치한다.
2. **G2 WebView 실전 대응**: Android 하드웨어 back, iOS 스와이프 back, 새로고침, 딥링크, 연타, 앱 백그라운드 복귀에서 깨지지 않는다.
3. **G3 브릿지 신뢰성**: 요청-응답 상관(id), 타임아웃, 에러 envelope, 호스트 지연 주입 감지, URL 검증을 갖춘다.
4. **G4 개발 경험(DX)**: 동적 라우트, 페이지별 params, 라이프사이클 훅, ESM 배포, 동작하는 lint·CI를 제공한다.

### 비목표

- 네이티브(Flutter/RN) SDK 패키지 제작. v2에서는 프로토콜 문서와 예제 스니펫만 제공한다.
- Next.js App Router 전체를 대체하는 라우터. Next 연동은 어댑터 수준까지만 다룬다.
- 탭 네비게이션, 모달 스택 등 멀티 스택(§6 후속 후보로 남김).

## 3. 사용자 / 시나리오

| 페르소나 | 핵심 시나리오 |
|----------|---------------|
| 하이브리드 앱 웹 개발자 | SPA 안에서 목록→상세 push, 상세에서 뒤로가기, 결제 완료 후 `reset` |
| 네이티브 개발자 (Flutter/RN) | 앱 푸시 알림 탭 → `stack.push('/notice/1')`, 하드웨어 back → 웹 스택 pop 또는 앱 종료 판단 |
| 라이브러리 유지보수자 | PR마다 lint·test·build가 돌고, 태그 push로 npm 배포 |

---

## 4. 오류 케이스 (현재 코드 기준 확인됨)

심각도: **P0** 사용자에게 바로 보이는 깨짐 · **P1** 특정 조건에서 깨짐 · **P2** 품질·DX 문제

### 4.1 스택 라우터 (`packages/core/src/stack-router/stack-router-provider.tsx`)

| ID | 심각도 | 케이스 | 원인 (위치) | 기대 동작 |
|----|--------|--------|-------------|-----------|
| E-01 | P0 | 3단 스택(A→B→C)에서 back 하면 **B까지 같이 오른쪽으로 사라져** 빈 화면이 된다 | push된 페이지는 모두 `isExiting: true`(L121)다. back 방향에서는 `isExiting`인 페이지 **전부**에 `slideOutRight`가 걸린다(L289-292). top만 걸리는 게 아니다 | 퇴장 애니메이션은 top 1장에만, 새 top에는 `slideInLeft` |
| E-02 | P0 | push할 때마다 **이미 스택에 있던 중간 페이지도 slide-in 애니메이션을 다시 재생**한다 | `isTransitioning`이 `false`로 돌아가지 않는다(L52, L74, L89, L107). 방향이 바뀌면 emotion 클래스가 새로 생겨 애니메이션이 재시작된다 | 전환 종료 시 `idle`, 애니메이션은 enter/exit 대상에만 |
| E-03 | P0 | Android 하드웨어 back, iOS 스와이프 back, 브라우저 뒤로가기를 하면 **URL만 바뀌고 화면은 그대로**다 | `popstate` 리스너(L69-80)는 `currentPath`만 바꾸고 `visiblePages`는 pop하지 않는다 | popstate에서도 스택 pop + 전환 |
| E-04 | P0 | 부모가 리렌더될 때마다 **스택이 초기 페이지 1장으로 리셋**된다 | `useEffect(..., [initialActivity])`(L57-65)이고, 데모와 README 모두 `initialActivity={{...}}`를 인라인 객체로 넘긴다 | 마운트 시 1회만 초기화(또는 `path` 비교) |
| E-05 | P0 | 스택이 1장일 때 back(`BackRouter` 연타 포함)을 하면 **페이지가 0장인 흰 화면**이 되고, `history.back()`으로 WebView 밖 히스토리까지 빠져나간다 | `handleBack`(L88-96)에 길이 가드가 없다 | 루트에서는 no-op 또는 `onExitRequest` 콜백(네이티브에 앱 종료·닫기 위임) |
| E-06 | P0 | 새로고침하거나 딥링크로 `/about`에 진입하면 **URL은 `/about`인데 화면은 Home**이다 | 초기 `visiblePages`는 항상 `initialActivity`다(L58). URL을 보고 복원하지 않는다 | URL 매칭 Activity로 시작(옵션: initial 위에 쌓기) |
| E-07 | P1 | 전환 중에 push를 연달아 하면(예: `/p3` 직후 `/p1`) 전환이 겹치고, 이미 있는 페이지가 맨 위로 끌려 올라온다. 같은 경로 연타는 E-09 정책 때문에 중복으로 쌓이지는 않는다(검증으로 정정) | 전환 중 잠금이 없다. 각 호출이 독립 `setTimeout`을 건다(L92, L124) | 전환 중 입력 무시 |
| E-08 | P1 | `Activities`에 없는 경로로 push하면 **URL만 바뀌고 화면은 그대로**다(조용한 실패) | 매칭 실패 시에도 `history.push`가 실행된다(L110-129) | dev 경고 + `notFound` Activity 또는 push 거부 |
| E-09 | P1 | 이미 스택에 있는 경로로 push하면 **그 페이지를 꺼내 맨 위로 옮기고**, key가 `path-index`(L151)라서 리마운트되어 상태(스크롤·폼)를 잃는다 | L113-117. 정책이 정의되어 있지 않다 | 정책 명시(`push`는 항상 새 인스턴스, `navigate`는 기존 페이지로 pop) + 고유 key |
| E-10 | P1 | `replace()`와 `forward()`가 **스택 UI에 반영되지 않는다** | context에 `history.replace`/`history.forward`를 그대로 노출한다(L139-141) | replace는 top 교체, forward는 미지원 또는 명시적 처리 |
| E-11 | P1 | `back()` 한 번에 리스너가 **두 번 호출**된다(전역 popstate 1회 + `back()` 내부 1회) | `history.ts` L12-16 전역 popstate 리스너와 L59-62 수동 notify | 이벤트 소스 단일화 |
| E-12 | P1 | `history.back()` 시 popstate가 오지 않으면(첫 엔트리, iOS bfcache 등) **Promise가 영원히 pending**이고 리스너가 누수된다 | `history.ts` L51-57, 타임아웃 없음 | 타임아웃 + 리스너 정리 |
| E-13 | P1 | 전환 중 언마운트되면 `setTimeout` 콜백이 setState를 호출한다(누수·경고) | Provider L92·L124, Header L13 타이머를 정리하지 않는다 | 언마운트 시 타이머·리스너 정리 |
| E-14 | P2 | `push(path, data)`의 `data`에 함수가 들어가면 실제 브라우저의 `pushState`는 `DataCloneError`를 던진다(HTML 스펙). jsdom은 clone하지 않아 테스트로는 재현되지 않는다 | `history.ts` L30 | `data`는 메모리 맵에 보관하고 history state에는 key만 저장 |
| E-15 | P1 | `push('/detail?id=1')`, `/detail/1`이 **매칭되지 않는다** | `a.path === path` 완전 일치(L110) | 동적 세그먼트·쿼리 분리 매칭 |
| E-16 | P1 | 페이지가 자신의 `data`를 읽을 방법이 없다. `currentState`는 전역 하나라 **하위 페이지가 상위 페이지의 데이터를 덮어쓴다** | context 설계 | 페이지 단위 `useActivity()` / `useParams()` |
| E-17 | P1 | `100vh` 고정(L180) 때문에 iOS WebView 주소창·키보드·safe area에서 **하단이 잘린다** | 스타일 | `100dvh` 폴백 체인 + `env(safe-area-inset-*)` 옵션 |
| E-18 | P2 | 모든 페이지에 `user-select: none`과 `cursor: grab`이 걸려 **본문 텍스트 복사가 안 되고**, 스와이프 기능이 없는데 grab 커서가 보인다 | L260-263 | 기본값 해제, 스와이프 기능을 켰을 때만 적용 |
| E-19 | P2 | 아래 깔린 페이지가 **스크린리더·탭 포커스로 접근 가능**하고, 전환 후 포커스를 관리하지 않는다 | 비활성 페이지에 `inert`/`aria-hidden` 없음 | 비활성 페이지 `inert`, 새 top으로 포커스 이동 |
| E-20 | P2 | `prefers-reduced-motion`을 무시한다 | keyframes 고정 | reduce일 때 애니메이션 0ms |
| E-21 | P2 | `isShowHeader` prop이 타입에만 있고 **동작하지 않는다** | `type.ts` L3, Provider에서 미사용 | 구현하거나 제거 |
| E-22 | P2 | SSR에서 `getCurrentState()`는 `/`를 반환하는데 클라이언트는 실제 경로라 **하이드레이션 불일치**가 날 수 있다 | `history.ts` L86-88, Provider L48-51 | 초기 상태를 effect에서 동기화하거나 `initialPath` prop 제공 |

### 4.2 브릿지 (`packages/core/src/bridge/*`)

| ID | 심각도 | 케이스 | 원인 (위치) | 기대 동작 |
|----|--------|--------|-------------|-----------|
| E-30 | P0 | Flutter에서 `flutter_inappwebview`가 **늦게 주입**되면(`flutterInAppWebViewPlatformReady` 이전) 호스트가 `browser`로 판정되고, outbound 브릿지는 `null`인 채로 **다시 시도하지 않는다** | `detect-host.ts`가 즉시 판정한다. `WebViewBridgeProvider` L37-39 | ready 이벤트 대기 + 재감지, 그 사이 요청은 큐잉 |
| E-31 | P0 | 페이지 안 어떤 스크립트든 `window.stackPush('javascript:...')`나 외부 URL을 호출할 수 있고, 그대로 `router.push`에 전달된다(**오픈 리다이렉트·스킴 주입**) | `host.ts` L99-105, URL 검증 없음 | `allowUrl` 검증(기본: 같은 origin 상대경로만, `javascript:`·`data:` 차단) |
| E-32 | P1 | `request()`가 전송 직후 자기 envelope를 반환하고 끝난다. **네이티브 응답·실패를 알 수 없다**(Flutter `callHandler` 반환값 폐기) | `client.ts` L31-38 | id 기반 응답 매칭, `Promise<Result>`, 타임아웃 |
| E-33 | P1 | 네이티브 → 웹 핸들러가 throw하면 **unhandled rejection**이 나고 네이티브는 실패를 모른다 | `host.ts` L91-93 `void handleBridgeMessage` | try/catch → `error` envelope 회신, `onError` 콜백 |
| E-34 | P1 | `stack` prop을 인라인 객체로 넘기면(문서 예제가 그렇다) **매 렌더마다 전역 핸들러를 삭제했다 재설치**한다. 그 사이 들어온 네이티브 호출은 유실된다 | `WebViewBridgeProvider` L49 deps | 핸들러를 ref로 보관, 설치는 1회 |
| E-35 | P1 | Provider가 둘이거나 `installBridgeHost`를 두 번 호출하면 전역을 덮어쓰고, 먼저 해제된 쪽이 **다른 쪽 전역까지 delete**한다 | `host.ts` L95, L114-123 | 레퍼런스 카운트 또는 소유자 확인 후 해제 + dev 경고 |
| E-36 | P1 | `stackReset(url, meta)`의 meta가 유실된다 | `stack-router-bridge.ts` L10·L31 시그니처에 meta 없음 | meta 전달 |
| E-37 | P1 | payload의 `url`이 문자열이 아니어도(숫자, 객체) 통과한다. 레거시 Flutter push는 url이 없으면 `""`를 보낸다 | `host.ts` L52-67, `transport.ts` L66 | 런타임 스키마 검증 → 실패 시 `INVALID_PAYLOAD` |
| E-38 | P1 | RN에서 `postMessage`가 throw하면(브릿지 미준비) 호출자가 원인을 알 수 없다 | `transport.ts` L39 `!` 단언 | try/catch → `BRIDGE_UNAVAILABLE` 에러 |
| E-39 | P2 | `exposeStackRouterBridge: true`(boolean)는 **아무 동작도 하지 않는다** | `host.ts` L108-112 | boolean이면 자동 생성하거나 타입에서 제거 |
| E-40 | P2 | `getStackRouterBridge()`가 설치되어 있지 않으면 **호출할 때마다 새 클라이언트를 만든다** | `stack-router-bridge.ts` L42 | 모듈 싱글턴 캐시 |
| E-41 | P2 | 프로토콜 버전 협상이 없다. 네이티브가 v2를 보내면 조용히 무시된다 | `isBridgeEnvelope` L60 | `bridge.hello` 핸드셰이크, 미지원 버전이면 `UNSUPPORTED_VERSION` 회신 |
| E-42 | P1 | **스택 라우터와 브릿지가 분리**되어 있다. 네이티브 `stack.push`가 `StackRouterProvider` 스택에 반영되지 않고, 웹 스택 깊이를 네이티브가 알 수 없어 하드웨어 back 판단(웹 pop vs 앱 종료)이 불가능하다 | 구조 | §5 F-01 어댑터 |

### 4.3 빌드 · 배포 · 저장소

| ID | 심각도 | 케이스 | 근거 | 기대 |
|----|--------|--------|------|------|
| E-50 | P0 | **`node_modules`가 git에 커밋**되어 있다. 추적 파일 26,294개 중 26,117개가 node_modules이고, `pnpm install`만 해도 수십 개 파일이 modified가 된다 | `git ls-files \| grep -c node_modules` | 히스토리에서 제거, `.gitignore` 정리 |
| E-51 | P0 | `pnpm lint` **실행 실패**: `Invalid option '--ext'`. ESLint 8.57 + flat config 조합이고, `typescript-eslint`와 `eslint-plugin-simple-import-sort`가 설치되어 있지 않다 | lint 실행 로그 | ESLint 9 flat config + 누락 의존성 추가 |
| E-52 | P1 | `src/bridge/window.d.ts`가 dist에 복사되지 않아 **소비자 프로젝트에서 `window.stackPush` 등 전역 타입이 사라진다** | `tsc`는 `.d.ts` 입력을 emit하지 않는다. `dist/bridge`에 window.d.ts 없음 | `declare global`을 `.ts` 파일로 옮기기 |
| E-53 | P1 | CJS 단일 빌드이고 `exports` 필드가 없다. `"sideEffects": false`라고 선언했지만 `history.ts`는 import 시점에 전역 popstate 리스너를 등록한다 | `package.json`, `history.ts` L12-17 | ESM+CJS 듀얼(tsup), `exports` 맵, 리스너 지연 등록 |
| E-54 | P1 | `stack-router/__tests__/stack-router.test.tsx`(185줄)는 jest `testMatch`(`src/__tests__/**`)에 안 걸려서 **한 번도 실행되지 않는다** | `jest.config.js` | testMatch를 `**/__tests__/**`로, 중복 스위트 정리 |
| E-55 | P1 | PR CI가 없다. `publish.yml`은 태그에서만 돌고 lint·typecheck 없이 test만 실행한다 | `.github/workflows` | PR 워크플로(lint·tsc·test·build·size) |
| E-56 | P2 | `dist/`를 커밋하고 있다(`.gitignore` 예외). 현재는 src와 일치하지만 드리프트 위험이 있다 | `.gitignore` `!packages/core/dist/` | dist 미커밋, 배포 시 빌드 |
| E-57 | P2 | peer `react >=16.8`인데 빌드가 `react-jsx` 런타임(React 17+)을 쓴다. 테스트는 React 18, 루트는 React 19 타입이다 | `package.json`, `tsconfig.build.json` | peer `>=17` 또는 `>=18`, 18/19 매트릭스 테스트 |
| E-58 | P2 | 데모(`browser`)가 core를 상대경로 `../../core/src`로 import한다. `tsup` entry `src/index.ts`가 없고, `test` 스크립트는 항상 exit 1이다 | `packages/browser` | `workspace:*` 의존, 스크립트 정리 |
| E-59 | P2 | ts-jest `globals` deprecated 경고가 반복되고, babel 설정이 없는데 `babelConfig: true`다 | test 로그 | jest config 정리 (또는 Vitest 전환) |
| E-60 | P2 | 공개 라이브러리 저장소에 제품 전용 `.cursor/agents/goldie-*`·rules가 들어 있다 | `.cursor/` | 제품 전용 설정 분리 또는 제거 |

---

## 5. 추가 기능

| ID | 우선 | 기능 | 설명 | 해결하는 오류 |
|----|------|------|------|----------------|
| F-01 | Must | **Router ↔ Bridge 어댑터** | `<StackRouterProvider bridge>` 옵션 하나로 네이티브 `stack.*` 수신을 웹 스택에 반영하고, 웹 스택 변화를 네이티브에 `stack.changed {depth, path}`로 알린다 | E-42 |
| F-02 | Must | **하드웨어 back 정책** | `onBackAtRoot`: `'exit'`(네이티브 `app.exit` 요청) / `'noop'` / 커스텀. 네이티브 → 웹 `back.request` 수신 시 웹이 처리 여부(`handled: boolean`)를 회신 | E-03, E-05 |
| F-03 | Must | **동적 라우트 · params** | `path: '/detail/:id'`, 쿼리 파싱, `useParams()`, `useSearchParams()` | E-15 |
| F-04 | Must | **페이지 단위 컨텍스트** | `useActivity()` → `{ path, params, data, isTop, depth }` | E-16 |
| F-05 | Must | **URL 기반 초기 복원** | 새로고침·딥링크 시 URL에 맞는 Activity로 시작. `restoreStack: 'top-only' \| 'with-root'` | E-06 |
| F-06 | Must | **Bridge 요청-응답** | `client.request(method, payload, { timeoutMs })` → 네이티브 `id` 회신 매칭, 에러 코드 표준화 | E-32, E-33, E-38 |
| F-07 | Must | **URL 검증 훅** | `allowUrl(url) => boolean`, 기본 same-origin 상대경로 | E-31 |
| F-08 | Should | **전환 잠금 · 큐** | `transitionPolicy: 'ignore' \| 'queue'` | E-07 |
| F-09 | Should | **라이프사이클 훅** | `useFocusEffect` / `onEnter` / `onLeave` (top 진입·이탈, 앱 포그라운드 복귀 포함) | — |
| F-10 | Should | **iOS 스와이프 back 제스처** | 좌측 엣지 드래그 + 진행률 기반 애니메이션, 옵트인 | E-18 |
| F-11 | Should | **전환 커스터마이즈** | `transition: 'slide' \| 'fade' \| 'none' \| custom`, `duration`, reduced-motion 자동 대응 | E-20 |
| F-12 | Should | **스택 API 확장** | `pop(n)`, `popTo(path)`, `reset(path)`, `replace` 정식 지원, `canGoBack` | E-10 |
| F-13 | Should | **페이지 상태 보존** | 비활성 페이지 유지/언마운트 정책(`keepAlive`, `maxDepth`), 스크롤 위치 복원 | E-09 |
| F-14 | Should | **Emotion 의존 제거** | CSS 모듈 또는 인라인 + `data-state` 속성. peer 의존을 react만 남김 | E-53 |
| F-15 | Could | **Next.js App Router 어댑터** | `@ahnseungchan/webviewkit/next` — `router.push`/`back` 핸들러 프리셋 | — |
| F-16 | Could | **DevTools 확장** | 로드맵에 전환 상태, 마지막 브릿지 메시지 로그, 호스트 종류 표시 | — |
| F-17 | Could | **브릿지 테스트 유틸** | `createMockNativeHost()` — RN/Flutter를 흉내 내 E2E·단위 테스트에 사용 | — |
| F-18 | Could | **프로토콜 핸드셰이크** | `bridge.hello {v, capabilities}` | E-41 |

### 5.1 F-01 · F-02 상세 (핵심)

```
[Native back 버튼]
  native → web : { method: "back.request", id }
  web          : depth > 1 ? pop() : onBackAtRoot
  web → native : { method: "back.request", id, payload: { handled: true|false } }
  native       : handled=false 면 앱 종료/WebView 닫기

[웹 스택 변화]
  web → native : { method: "stack.changed", payload: { depth, path } }
  native       : 스와이프-back 제스처 활성/비활성 결정 (depth === 1 일 때만 네이티브 제스처)
```

### 5.2 에러 코드 표준 (F-06)

| code | 의미 |
|------|------|
| `TIMEOUT` | 응답 시간 초과 |
| `BRIDGE_UNAVAILABLE` | 호스트 미감지·미준비 |
| `INVALID_PAYLOAD` | 스키마 검증 실패 |
| `URL_NOT_ALLOWED` | `allowUrl` 거부 |
| `UNKNOWN_METHOD` | 핸들러 없음 |
| `HANDLER_ERROR` | 핸들러 throw |
| `UNSUPPORTED_VERSION` | 프로토콜 버전 불일치 |

---

## 6. 개선점 (리팩터 · 구조)

| ID | 항목 | 내용 |
|----|------|------|
| I-01 | 상태 모델 단일화 | `currentPath`/`currentState`/`isTransitioning`/`direction`/`visiblePages`로 흩어진 상태를 `useReducer` 하나의 `{ stack: Entry[], transition: {type, from, to} \| null }`로 바꾼다. Entry는 고유 `key`(uuid)를 가진다 |
| I-02 | 이벤트 소스 단일화 | 모든 이동은 `history` 래퍼 → popstate 한 경로로 처리한다. history state에 `{ key, index }`를 넣어 popstate 시 방향(back/forward)과 pop 개수를 계산한다 |
| I-03 | 이름 정정 | `isEntering`/`isExiting`의 의미가 반대로 쓰이고 있다(새 페이지가 `isExiting`). `enter`/`exit`/`idle` 상태로 정정한다 |
| I-04 | 타이머 제거 | `setTimeout(500)` 대신 `animationend` 이벤트 + 안전 타임아웃으로 전환 종료를 판정한다. 테스트는 fake timer로 검증한다 |
| I-05 | `history` 지연 제거 | `push`가 `STACK_TRANSITION_MS * 0.6`만큼 기다린 뒤 notify하는 구조를 없앤다. 상태는 즉시 갱신하고 시각적 지연은 CSS만 담당한다 |
| I-06 | 접근성 | `BackRouter`에 `aria-label="뒤로 가기"`(라벨 prop 제공), 비활성 페이지 `inert`, top 전환 시 포커스 이동 |
| I-07 | 스타일 토큰 | 하드코딩 색상(`#000`, `#e5e7eb`)을 CSS 변수(`--wvk-*`)로 노출해 테마를 바꿀 수 있게 한다 |
| I-08 | 테스트 강화 | 애니메이션 상태(`data-state`), URL 동기화, popstate, 연타, 언마운트, 브릿지 에러 경로를 테스트한다. RN·Flutter 목 호스트를 쓴 통합 테스트를 추가한다 |
| I-09 | 패키지 | tsup로 ESM+CJS+d.ts, `exports` 맵, `size-limit` 예산(예: 8 kB gz) |
| I-10 | 문서 | 정책표(push 중복, 루트 back, 딥링크), 마이그레이션 가이드 v1→v2, Flutter·RN 네이티브 스니펫(응답 회신 포함) |

---

## 7. 수용 기준 (Acceptance Criteria)

### 스택 정확성

- [ ] A→B→C에서 back 하면 C만 퇴장하고, B는 화면에 보이며(`data-state="idle"`, transform 0), A는 그대로다 (E-01)
- [ ] 전환이 끝나면 모든 페이지가 `idle`이고, 다음 push에서 기존 페이지의 애니메이션이 재생되지 않는다 (E-02)
- [ ] `popstate`(브라우저 back)를 dispatch하면 `visiblePages.length`가 1 줄고 URL과 top path가 같다 (E-03)
- [ ] 부모를 10회 리렌더해도 스택 깊이가 유지된다 (E-04)
- [ ] 루트에서 back을 호출하면 `history.back`이 실행되지 않고 `onBackAtRoot`가 1회 호출된다 (E-05)
- [ ] `/detail/3`으로 새로고침하면 Detail이 렌더되고 `useParams().id === '3'`이다 (E-06, F-03)
- [ ] push를 50ms 간격으로 2회 호출하면 스택이 1만큼만 증가한다(`ignore` 정책) (E-07)
- [ ] 미등록 경로로 push하면 URL이 바뀌지 않고 dev 콘솔에 경고가 1회 찍힌다 (E-08)
- [ ] 전환 중에 언마운트해도 React 경고·타이머 잔존이 없다 (E-13)

### 브릿지

- [ ] Flutter 객체가 500ms 뒤에 주입되어도, 그 전에 호출한 `push`가 ready 후 전송된다 (E-30)
- [ ] `stackPush('javascript:alert(1)')`와 `stackPush('https://evil.com')`는 거부되고 `URL_NOT_ALLOWED`가 반환된다 (E-31)
- [ ] 네이티브가 3초 안에 응답하지 않으면 `TIMEOUT`으로 reject된다 (E-32)
- [ ] 핸들러가 throw하면 네이티브로 `HANDLER_ERROR` envelope가 회신되고 unhandled rejection이 없다 (E-33)
- [ ] `stack` prop을 인라인으로 넘기고 리렌더해도 `installBridgeHost`가 1회만 실행된다 (E-34)

### 빌드·저장소

- [ ] `git ls-files | grep node_modules`가 0건이다 (E-50)
- [ ] `pnpm lint`, `pnpm -r exec tsc --noEmit`, `pnpm test`, `pnpm build`가 PR CI에서 모두 통과한다 (E-51, E-55)
- [ ] 소비자 TS 프로젝트에서 `window.stackPush` 타입이 인식된다 (E-52)
- [ ] `import { history } from '@ahnseungchan/webviewkit'`만 해도 ESM 번들러가 나머지를 트리셰이킹한다 (E-53)
- [ ] 모든 테스트 파일이 실행되고, 커버리지 lines ≥ 80%다 (E-54)

---

## 8. 마일스톤

| 단계 | 버전 | 범위 | 호환성 |
|------|------|------|--------|
| M0 저장소 위생 | 1.3.1 | E-50, E-51, E-52, E-54, E-55, E-56, E-59 | 호환 |
| M1 치명 버그 | 1.4.0 | E-01~E-08, E-11~E-13, E-30, E-31, E-33, E-34 · I-01~I-05 | 호환(내부 리팩터) |
| M2 기능 | 2.0.0 | F-01~F-07, F-12, E-09, E-10, E-14~E-16, E-36~E-38, I-09 (ESM·exports) | **Breaking**: 응답 Promise 타입, `reset` 시그니처, peer react ≥18 |
| M3 품질 | 2.1.0 | F-08~F-11, F-13, F-14, E-17~E-22, I-06~I-08 | 호환 |
| M4 생태계 | 2.2.0 | F-15~F-18, I-10 | 호환 |

## 9. 리스크

| 리스크 | 대응 |
|--------|------|
| 기존 사용자의 Flutter 레거시 핸들러(`stackPush`) 호환이 깨질 수 있다 | `flutterLegacyHandlers` 기본값 유지, 응답 매칭은 레거시 경로에서 `callHandler` 반환값을 사용 |
| popstate 기반 단일화가 iOS bfcache·Android WebView 구버전에서 다르게 동작할 수 있다 | 실기기 매트릭스(iOS 16/17/18, Android 10/12/14 System WebView)에서 수동 QA 체크리스트 운영 |
| Emotion 제거(F-14)로 스타일 커스터마이즈 방식이 바뀐다 | CSS 변수·`className` prop을 제공하고 2.x 마이너에서 진행 |

## 10. 검증 로그 (작성 시점 실측)

| 명령 | 결과 |
|------|------|
| `pnpm test` | 5 suites / 27 tests 통과. `stack-router/__tests__` 미실행, ts-jest deprecated 경고 5회 |
| `pnpm lint` | 실패 — `Invalid option '--ext'` |
| `tsc -p tsconfig.build.json` | 오류 없음. 재빌드 결과가 커밋된 dist와 동일 |
| `packages/browser` `vite build` | 성공 (178 kB, gzip 59.8 kB) |
| `git ls-files` | 26,294개 중 node_modules 26,117개 |
| `git checkout -- node_modules` 후 `pnpm test` | **20 failed**. 커밋된 node_modules가 React 18(core)과 react-dom 19(root)를 섞어 `Cannot read properties of null (reading 'useMemo')`가 난다. `pnpm install`로 다시 링크해야 통과한다 → E-50 근거 |

## 11. PRD 검증 결과 (2026-11-04)

재현 테스트(`zz-prd-verify.test.tsx`, jsdom, 25케이스)를 실행하고 코드를 정적으로 확인한 결과다.

| 판정 | ID |
|------|-----|
| 재현 확인 | E-01 (back 중 p2·p3 애니메이션 동일, `slideOutRight`) · E-02 (전환이 끝난 뒤에도 p1 animation이 `none`이 아님) · E-03 (URL `/p1`인데 페이지 2장) · E-04 (2→1장) · E-05 (0장) · E-06 (URL `/p2`, 화면 p1) · E-08 (URL `/nope`, `currentPath`도 `/nope`) · E-09 (순서 p1,p3,p2 · 카운터 2→0) · E-10 (URL `/p2`, 화면 p1) · E-11 (리스너 2회) · E-12 (1.5초 뒤에도 pending) · E-15 · E-16 · E-19 · E-30 · E-31 (`javascript:`·외부 URL이 그대로 전달) · E-32 (envelope만 반환) · E-33 (reject 전파) · E-34 · E-35 · E-36 (`meta: null`) · E-37 (`url: 123` 통과) · E-38 · E-39 · E-40 |
| 정적 확인 | E-13, E-17, E-18, E-20, E-21 (`isShowHeader` 참조 0건), E-22, E-41, E-42, E-50~E-60 |
| 정정 | E-07 (같은 경로 연타는 중복으로 쌓이지 않음 → 서술 수정) · E-14 (jsdom 미재현, P1→P2) |

구현 범위와 상세 설계: [`docs/specs/webviewkit-v2/spec.md`](../specs/webviewkit-v2/spec.md)
