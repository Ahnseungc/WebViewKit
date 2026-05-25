# WebViewKit

모노레포 — npm 패키지 [`@ahnseungchan/webviewkit`](https://www.npmjs.com/package/@ahnseungchan/webviewkit)

React WebView에서 네이티브 앱처럼 **스택 push/back** 네비게이션을 구현합니다.

## Packages

| 패키지 | 설명 |
|--------|------|
| `@ahnseungchan/webviewkit` | 스택 라우터 + history + **Dev Stack Roadmap** |
| `@webviewkit/browser` | Vite 데모 앱 |

## 개발

```bash
pnpm install
pnpm build
pnpm test
```

## npm 배포

```bash
cd packages/core
npm run build
npm publish --access public
# 또는 루트: pnpm publish:webviewkit
```

## 커밋 히스토리 요약

| 날짜 | 내용 |
|------|------|
| 2025-05-17 | history, browser 예제 |
| 2025-05-31 | stack-router 구조·테스트 |
| 2026-05-25 | v1.1.0 — dev roadmap, 빌드/npm 수정, gsap 제거 |

자세한 변경: [CHANGELOG.md](./CHANGELOG.md) · [packages/core/README.md](./packages/core/README.md)

## License

MIT
