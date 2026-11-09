# @ahnseungchan/webviewkit

React **WebView·하이브리드 앱**용 스택(push/back) 네비게이션 + 네이티브 브릿지(RN·Flutter) 라이브러리입니다.  
`history.pushState`와 CSS 슬라이드 전환으로 네이티브 앱에 가까운 화면 이동을 구현합니다.

## 설치

```bash
npm install @ahnseungchan/webviewkit
npm install react react-dom @emotion/react @emotion/styled   # peer (react >= 18)
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
| `push(path)` | 항상 새 엔트리. 전환 중이면 무시(`false`) |
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
| `Activities` | `[]` | `{ path, element, keepAlive? }[]`. path 에 `:param` 사용 가능. `keepAlive: true` 면 pop 뒤에도 마운트 유지(스크롤·입력·state 보존), 같은 path(pathname+search) push 시 되살림. replace·reset 은 되살리지 않음 |
| `keepAliveLimit` | `5` (`KEEP_ALIVE_LIMIT`) | 캐시할 keepAlive 페이지 최대 개수(스택 위 keepAlive 페이지 포함). `0` 이면 끔. 마운트 시 1회만 읽음 |
| `maxMountedPages` | 무제한 | 동시 마운트 페이지 상한(1 미만은 1). keepAlive·전환 중 페이지는 항상 마운트, 그 외는 back 시 새로 마운트. 15개 초과 시 dev 경고 |
| `transition` | `"slide"` | `"slide"`(iOS 네이티브 스택: 패럴랙스·dim·가장자리 그림자) · `"fade"` · `"none"` |
| `duration` | `500` | 전환 ms |
| `restoreStack` | `"with-root"` | 딥링크 복원 정책 |
| `onBackAtRoot` / `onNotFound` | — | 콜백 |
| `isShowHeader` | `false` | 각 페이지 상단에 `StackHeader` 렌더. 헤더가 페이지와 함께 슬라이드되고, 스크롤 시 상단 고정(sticky) |
| `safeArea` | `false` | `env(safe-area-inset-*)` padding |
| `maxWidth` | `"600px"` | 본문 최대 폭 |
| `enableDevTools` | dev 에서 true | 스택 로드맵 오버레이 |
| `bridge` | — | `true` 또는 `{ allowUrl, onError, emitStackChanged }` — 네이티브 연동 |

## Hooks

| hook | 반환 |
|------|------|
| `useStackRouter()` | `push`, `replace`, `reset`, `resetPush`, `back`, `pop(n)`, `popTo(path)`, `canGoBack`, `depth`, `currentPath`, `currentState`, `entries`, `isTransitioning` |
| `useStackRouter().resetPush(path, data?)` | 루트만 남기고 `path` 를 push (스택 `[루트, path]`, push 슬라이드). 결제 완료 → 결과 화면처럼 중간 단계를 지울 때 |
| `useActivity()` | 현재 페이지의 `{ key, path, pattern, params, query, data, index, isTop, isCached }`. `isCached` 는 keepAlive 로 숨겨진 상태 |
| `useOnRevive(callback)` | 캐시된 페이지가 되살아날 때 `callback(data)` 1회 호출(최초 마운트 제외). 새 `data` 로 화면을 갱신할 때 |
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
