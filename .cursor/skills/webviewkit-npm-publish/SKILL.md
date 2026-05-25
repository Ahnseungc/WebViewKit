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

### CI (권장): Trusted Publisher + GitHub Actions

- npm 패키지 Settings → Trusted Publisher: `Ahnseungc/WebViewKit`, workflow `publish.yml`
- 태그 푸시 (npm publish + GitHub Release): `git tag v1.2.0 && git push origin v1.2.0`
  - 태그 `v*`는 `packages/core/package.json` `version`과 일치해야 함
  - Release 본문은 `CHANGELOG.md` 해당 버전 섹션에서 자동 추출
- Actions **Run workflow** (수동): npm만, GitHub Release는 태그 푸시 시에만 생성

### 로컬 (2FA OTP 필요)

```bash
npm login
npm publish --access public --otp=앱6자리
```

## 실패 시

- **404 / scope**: npm 로그인 계정이 `@ahnseungchan` 권한 있는지 확인
- **tarball에 dist 없음**: `.npmignore`·`!packages/core/dist/` in root `.gitignore`

## Post

- Git tag `v1.x.x` (선택)
- `goldie_front_main` 에 버전 bump PR은 별도 저장소 작업
