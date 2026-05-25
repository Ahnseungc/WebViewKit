---
name: webviewkit-npm-publish
description: >-
  Publish @ahnseungchan/webviewkit to npm. build, pack verification, version bump, publish.
  Use when user asks npm publish, release, or package upload.
---

# WebViewKit npm Publish

## Pre-flight

```bash
cd packages/core
pnpm test
pnpm run build
ls dist/index.js
npm pack --dry-run   # dist/** 20+ files required
```

## Version

- `packages/core/package.json` `version`
- `CHANGELOG.md` 항목 추가

## Publish

```bash
npm login
npm publish --access public
```

## 실패 시

- **404 / scope**: npm 로그인 계정이 `@ahnseungchan` 권한 있는지 확인
- **tarball에 dist 없음**: `.npmignore`·`!packages/core/dist/` in root `.gitignore`

## Post

- Git tag `v1.x.x` (선택)
- `goldie_front_main` 에 버전 bump PR은 별도 저장소 작업
