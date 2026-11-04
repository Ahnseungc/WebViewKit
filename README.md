# WebViewKit

모노레포 — npm 패키지 [`@ahnseungchan/webviewkit`](https://www.npmjs.com/package/@ahnseungchan/webviewkit)

React WebView에서 네이티브 앱처럼 **스택 push/back** 네비게이션을 구현합니다.

## Packages

| 패키지 | 설명 |
|--------|------|
| `@ahnseungchan/webviewkit` | 스택 라우터(동적 라우트·딥링크 복원) + RN·Flutter 브릿지 + Dev Stack Roadmap |
| `@webviewkit/browser` | Vite 데모 앱 |

## 개발

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm --filter @webviewkit/browser dev   # 데모
```

## npm 배포

`packages/core/package.json` 의 version 과 `CHANGELOG.md` 를 올린 뒤 `v<version>` 태그를 push 하면
`.github/workflows/publish.yml` 이 npm Trusted Publishing 으로 배포하고 GitHub Release 를 만듭니다.

```bash
git tag v2.0.0 && git push origin v2.0.0
```

## 커밋 히스토리 요약

| 날짜 | 내용 |
|------|------|
| 2025-05-17 | history, browser 예제 |
| 2025-05-31 | stack-router 구조·테스트 |
| 2026-05-25 | v1.1.0 — dev roadmap, 빌드/npm 수정, gsap 제거 |
| 2026-11-04 | v2.0.0 — 스택 라우터 재구현, 브릿지 응답·URL 검증, ESM, CI |

자세한 변경: [CHANGELOG.md](./CHANGELOG.md) · [packages/core/README.md](./packages/core/README.md) · [PRD](./docs/prd/webviewkit-v2-prd.md) · [v2 스펙](./docs/specs/webviewkit-v2/spec.md)

## License

MIT
