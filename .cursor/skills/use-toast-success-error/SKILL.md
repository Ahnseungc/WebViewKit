---
name: use-toast-success-error
description: >-
  Uses @/hooks/common/useToast destructured success and error for user feedback;
  avoids showToast for success/failure cases and bans ad-hoc toast APIs. Use when
  adding toasts, useToast, react-toastify, or when the user mentions 토스트,
  shotToast, shortToast, success error toast.
---

# 토스트 — `success` / `error` 만 사용 (성공·실패 UX)

원본 규칙: `.cursor/rules/toast-useToast-success-error.mdc`

## 에이전트가 할 일

1. **`useToast()`** 를 import한 뒤 **`const { success, error } = useToast();`** 형태로 쓴다. (필요 시 `dismissAll` 등만 추가.)
2. **성공** 안내 → **`success('…')`**, **실패·오류** → **`error('…')`**.
3. **`showToast`**는 **성공/실패 구분이 없는** 중립 안내에만 쓰고, 성공/실패 피드백을 **`showToast`로 통일하지 않는다**.
4. **`toast()` 직접 호출**(react-toastify)로 스타일을 우회하지 않는다 — 공통 훅만 사용.

## 금지

- **`shotToast` / `shortToast`** 등 훅에 없는 별칭·래퍼 신설(오타·구 API 혼동 방지).

## 구현 참고

- 훅 정의: `hooks/common/useToast.ts`
