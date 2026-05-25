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
| `stack.push` | `{ url, meta? }` | web → native |
| `stack.replace` | `{ url, meta? }` | web → native |
| `stack.pop` | (없음) | web → native |
| `stack.reset` | `{ url, meta? }` | web → native |

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
