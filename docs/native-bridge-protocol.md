# Native Bridge Protocol (v1)

WebViewKit은 **React Native**·**Flutter** WebView와 동일한 JSON 프로토콜로 통신합니다.  
많은 하이브리드 앱에서 쓰이는 `stackPush` / `stackPop` 핸들러 이름과도 맞출 수 있습니다.

## Envelope

```json
{
  "v": 1,
  "ns": "webviewkit",
  "id": "uuid",
  "method": "stack.push",
  "payload": { "url": "/detail", "meta": null }
}
```

| `method` | `payload` | 방향 |
|----------|-----------|------|
| `stack.push` | `{ url, meta? }` | 양방향 |
| `stack.replace` | `{ url, meta? }` | 양방향 |
| `stack.pop` | (없음) | 양방향 |
| `stack.reset` | `{ url, meta? }` | 양방향 |
| `stack.changed` | `{ depth, path }` | web → native (2.0) |
| `back.request` | (없음) | native → web (2.0), 응답 `{ handled }` |
| `bridge.response` | 요청별 | 응답. `replyTo` = 원 요청 `id` (2.0) |

### 응답 (2.0)

```json
{ "v": 1, "ns": "webviewkit", "id": "…", "method": "bridge.response",
  "replyTo": "<요청 id>", "payload": { "handled": true } }
```

실패 시 `error: { code, message }` 를 붙입니다.

| code | 의미 |
|------|------|
| `TIMEOUT` | 응답 시간 초과 |
| `BRIDGE_UNAVAILABLE` | 호스트 미감지·미준비 |
| `INVALID_PAYLOAD` | `url` 이 비어 있거나 문자열이 아님 |
| `URL_NOT_ALLOWED` | URL 정책 위반 (기본: 같은 origin 경로만) |
| `UNKNOWN_METHOD` | 핸들러 없음 |
| `HANDLER_ERROR` | 핸들러 예외 |

- `back.request` 에는 웹이 **항상** 회신합니다. `handled: false` 면 웹 스택이 루트라는 뜻이므로 네이티브가 앱 종료·WebView 닫기를 처리합니다.
- 다른 요청은 `installBridgeHost({ replyToNative: true })` 일 때만 회신합니다.
- RN 에서 web → native 요청의 응답을 받으려면 `client.request(method, payload, { expectResponse: true })` 로 보내고, 네이티브는 위 형식으로 `injectJavaScript` → `window.webviewkitBridge.postMessage(...)` 합니다.
- Flutter 는 `callHandler` 반환값이 그대로 `result` 가 됩니다.

## Web (Next.js / React)

```tsx
import { WebViewBridgeProvider } from "@ahnseungchan/webviewkit";
import { useRouter } from "next/navigation";

function BridgeRoot({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <WebViewBridgeProvider
      stack={{
        push: (url) => {
          router.push(url);
          return true;
        },
        replace: (url) => {
          router.replace(url);
          return true;
        },
        pop: () => {
          router.back();
          return true;
        },
        reset: (url) => {
          router.replace(url);
          return true;
        },
      }}
    >
      {children}
    </WebViewBridgeProvider>
  );
}
```

웹 → 네이티브만 필요할 때:

```ts
import { getStackRouterBridge } from "@ahnseungchan/webviewkit";

await getStackRouterBridge()?.push("/detail");
```

## Flutter (flutter_inappwebview)

**웹 → 앱** — 레거시 핸들러:

- `stackPush(url, meta)`
- `stackReplace(url, meta)`
- `stackPop()`
- `stackReset(url)`

**앱 → 웹** — `evaluateJavascript`:

```javascript
window.stackPush('/notice/1');
// 또는 프로토콜 envelope
window.webviewkitBridge.postMessage('{"v":1,"ns":"webviewkit","id":"1","method":"stack.push","payload":{"url":"/notice/1"}}');
```

## React Native (react-native-webview)

**웹 → 앱** — `postMessage`로 envelope 전송. 네이티브에서 `onMessage` 파싱:

```tsx
// WebView onMessage
const msg = JSON.parse(event.nativeEvent.data);
if (msg.ns === 'webviewkit' && msg.method === 'stack.push') {
  navigation.push(msg.payload.url);
}
```

**앱 → 웹** — `injectJavaScript`:

```javascript
window.webviewkitBridge.postMessage(JSON.stringify({
  v: 1, ns: 'webviewkit', id: '1', method: 'stack.pop'
}));
```

## API 요약

| Export | 역할 |
|--------|------|
| `WebViewBridgeProvider` | ingress + `stackRouterBridge` 설치 |
| `createWebViewBridgeClient` | 프로토콜 클라이언트 |
| `installBridgeHost` | `window.webviewkitBridge` / `stackPush` 등 |
| `createStackRouterBridge` | `window.stackRouterBridge` |
| `detectBridgeHost` | `react-native` \| `flutter` \| `browser` |
| `parseBridgeMessage` | envelope 파싱 |

## 기존 커스텀 브릿지에서 이전

앱에 이미 `StackRouterBridge`·`window.stackPush` 패턴이 있으면 `WebViewBridgeProvider`와 `getStackRouterBridge()`로 점진 교체할 수 있습니다.  
핸들러 이름과 URL 규칙은 **앱·웹 합의**에 맞추면 됩니다.
