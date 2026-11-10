# @ahnseungchan/webviewkit (한국어)

[English](../README.md)

React **WebView·하이브리드 앱**용 스택(push/back) 네비게이션 + 네이티브 브릿지(RN·Flutter) 라이브러리입니다.  
`history.pushState`와 CSS 슬라이드 전환으로 네이티브 앱에 가까운 화면 이동을 구현합니다.

## 설치

```bash
npm install @ahnseungchan/webviewkit
npm install react react-dom   # peer (react >= 18). emotion 은 함께 설치된다
```

## Quick Start

```tsx
import {
  StackRouterProvider,
  useParams,
  useStackRouter,
} from "@ahnseungchan/webviewkit";

function Home() {
  const { push } = useStackRouter();
  return <button onClick={() => push("/detail/1?tab=info")}>Detail</button>;
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const { back } = useStackRouter();
  return <button onClick={back}>Back from {id}</button>;
}

export default function App() {
  return (
    <StackRouterProvider
      Activities={[
        { path: "/", element: <Home /> },
        { path: "/detail/:id", element: <Detail /> },
      ]}
      initialActivity={{ path: "/", element: <Home /> }}
      onBackAtRoot={() => window.close()}
    />
  );
}
```

## 동작 규칙

| 상황 | 동작 |
|------|------|
| `push(path)` | 새 엔트리를 쌓는다. 단 `keepAlive` 페이지의 캐시본이 같은 path 로 있으면 그 인스턴스를 되살린다. 전환 중이면 무시(`false`) |
| 같은 path 다시 push | 새 인스턴스가 쌓인다. 기존 페이지로 가려면 `popTo(path)`. 단 `keepAlive` 페이지는 캐시된 인스턴스가 되살아난다 |
| 브라우저·하드웨어 back | popstate 로 스택 pop (URL·화면 항상 일치) |
| 루트에서 `back()` | history 를 건드리지 않고 `onBackAtRoot()` |
| 미등록 path | URL 변경 없음, dev 경고 + `onNotFound(path)` |
| 새로고침·딥링크 | `restoreStack="with-root"`(기본) → `[root, 대상]`, `"top-only"` → `[대상]` |
| 아래 깔린 페이지 | `visibility: hidden` + `inert` + `aria-hidden` |
| `prefers-reduced-motion` | 전환 0ms |

## `StackRouterProvider` props

| prop | 기본 | 설명 |
|------|------|------|
| `initialActivity` | — | 루트 페이지. 마운트 시 1회만 읽음 |
| `Activities` | `[]` | `{ path, element, keepAlive? }[]`. path 에 `:param` 사용 가능. `keepAlive: true` 면 pop 뒤에도 마운트 유지(스크롤·입력·state 보존), 같은 path(pathname+search) push 시 되살림. replace·reset 은 되살리지 않고 대상 path 의 캐시본을 버림 |
| `keepAliveLimit` | `5` (`KEEP_ALIVE_LIMIT`) | 캐시할 keepAlive 페이지 최대 개수(스택 위 keepAlive 페이지 포함). `0` 이면 끔(`keepAlive` 라우트도 일반 페이지처럼 동작). 마운트 시 1회만 읽음 |
| `maxMountedPages` | 무제한 | 동시 마운트 페이지 상한(1 미만은 1, 유한한 수가 아니면 무제한). 스택 안·캐시된 keepAlive 페이지는 상한과 무관하게 언마운트하지 않으므로 keepAlive 페이지가 많으면 상한보다 많이 마운트될 수 있다(`keepAliveLimit` 으로 제한). 전환 중 페이지도 마운트하되, 언마운트돼 있던 페이지는 퇴장 슬라이드를 위해 다시 마운트하지 않는다. 그 외는 back 시 새로 마운트. 15개 초과 시 dev 경고 |
| `transition` | `"slide"` | `"slide"`(iOS 네이티브 스택: 패럴랙스·dim·가장자리 그림자) · `"fade"` · `"none"` |
| `duration` | `500` | 전환 ms |
| `popStateTransition` | `"animate"` | 브라우저 popstate(하드웨어·브라우저 back/forward, iOS WKWebView 엣지 스와이프 등 WebViewKit 의 `back`·`pop`·`popTo` 가 아닌 history 이동)로 생기는 전환. `"none"` 이면 애니메이션 없이 즉시 반영. React Native WebView 에서 `allowsBackForwardNavigationGestures` 로 네이티브 스와이프 back 을 쓰면 WKWebView 가 이미 스냅샷을 슬라이드한 뒤 popstate 가 오므로, `"none"` 으로 두 번 슬라이드되는 것을 막는다. `push`·`back()`·`pop`·`popTo`·`resetPush` 는 그대로 슬라이드 |
| `restoreStack` | `"with-root"` | 딥링크 복원 정책 |
| `onBackAtRoot` / `onNotFound` | — | 콜백 |
| `isShowHeader` | `false` | 각 페이지 상단에 `StackHeader` 렌더. 헤더가 페이지와 함께 슬라이드되고, 스크롤 시 상단 고정(sticky) |
| `safeArea` | `false` | `env(safe-area-inset-*)` padding |
| `maxWidth` | `"600px"` | 본문 최대 폭 |
| `enableDevTools` | `false` | 스택 로드맵 오버레이 (개발 중 켜서 쓴다) |
| `bridge` | — | `true` 또는 `{ allowUrl, onError, emitStackChanged }` — 네이티브 연동 |

## Hooks

| hook | 반환 |
|------|------|
| `useStackRouter()` | `push`, `replace`, `reset`, `resetPush`, `back`, `pop(n)`, `popTo(path)`, `canGoBack`, `depth`, `currentPath`, `currentState`, `entries`, `isTransitioning` |
| `useOptionalStackRouter()` | `useStackRouter()` 와 같지만 Provider 밖이면 `null` (throw 안 함). 스택 안·밖에서 같이 쓰는 링크·컴포넌트에서 분기할 때 |
| `useStackRouter().resetPush(path, data?)` | 루트만 남기고 `path` 를 push (스택 `[루트, path]`, push 슬라이드). 결제 완료 → 결과 화면처럼 중간 단계를 지울 때 |
| `useActivity()` | 현재 페이지의 `{ key, path, pattern, params, query, data, index, isTop, isCached, revision }`. `index` 는 스택 위치(0 = 루트, 캐시 중이면 `-1`). `isCached` 는 keepAlive 로 숨겨진 상태. `revision` 은 인스턴스가 새 `data` 로 재사용된 횟수 |
| `useOnRevive(callback)` | 기존 인스턴스가 새 `data` 로 재사용될 때마다 `callback(data)` 1회 호출: 캐시된 페이지가 되살아날 때, `resetPush` 가 스택 안 keepAlive 인스턴스를 재사용할 때. 최초 마운트에는 호출 안 함. 스택 밖에서는 아무것도 안 함. 되살아난 목록은 데이터를 다시 부르지 않으니, 최신 데이터가 필요하면 여기서 다시 불러온다 |
| `useParams()` | `params` |

테마는 CSS 변수로 바꿉니다: `--wvk-page-bg`, `--wvk-dim-color`, `--wvk-edge-shadow`, `--wvk-header-bg`, `--wvk-header-border`, `--wvk-header-color`, `--wvk-back-color`.

## Native Bridge

```tsx
// 1) 스택 라우터와 네이티브를 바로 연결
<StackRouterProvider bridge {...props} />

// 2) Next.js 등 다른 라우터와 연결
<WebViewBridgeProvider stack={{ push, replace, pop, reset }} />

// 3) web → native 호출
import { BridgeError, getStackRouterBridge } from "@ahnseungchan/webviewkit";
try {
  const { result } = (await getStackRouterBridge()?.push("/detail")) ?? {};
} catch (error) {
  if (error instanceof BridgeError && error.code === "TIMEOUT") { /* ... */ }
}
```

- inbound·outbound URL 은 기본적으로 **같은 origin 경로만** 허용합니다(`javascript:`·외부 URL 거부). `allowUrl` 로 교체할 수 있습니다.
- Flutter 브릿지가 늦게 주입돼도(`flutterInAppWebViewPlatformReady`) 감지 후 설치합니다.
- 하드웨어 back: 네이티브가 `back.request` 를 보내면 웹이 `{ handled }` 로 회신합니다. `handled: false` 면 앱이 종료·닫기를 판단합니다.

프로토콜 상세: [docs/native-bridge-protocol.md](https://github.com/Ahnseungc/WebViewKit/blob/main/docs/native-bridge-protocol.md)

## 1.x → 2.0

[CHANGELOG](https://github.com/Ahnseungc/WebViewKit/blob/main/CHANGELOG.md#200---2026-11-04) 의 Breaking · Migration 을 참고하세요.

## License

MIT
