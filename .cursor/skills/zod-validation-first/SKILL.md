---
name: zod-validation-first
description: >-
  Enforces a strict Zod-first validation workflow in Goldie. Validate all
  inbound values (form, params, query, API payloads, storage, env) with Zod
  before use. Use when user mentions zod, schema, validation, 유효성 검사,
  폼 검증, 파라미터 검증, API 응답 검증.
---

# Zod Validation First - 스킬

원본 규칙: `.cursor/rules/zod-validation-first.mdc`

## 에이전트가 할 일

1. 작업 시작 시 입력 경계를 먼저 식별한다.
   - 폼 입력, `params`, `searchParams`, API 응답/요청, 스토리지, env.
2. 각 경계별 Zod 스키마를 만든다.
   - 이미 있으면 재사용하고, 없으면 도메인 근처에 생성한다.
3. 검증 통과 데이터만 다음 단계로 넘긴다.
   - 필수 경로: `parse`
   - 복구 가능 경로: `safeParse` + 실패 처리
4. 실패 UX를 반드시 붙인다.
   - 토스트, 에러 상태, fallback, 리다이렉트 중 하나를 명시한다.
5. 테스트를 같이 작성/보강한다.
   - 정상값 1개 이상, 실패 케이스 1개 이상.

## 빠른 체크리스트

- [ ] 외부에서 들어온 값에 스키마가 있는가?
- [ ] `as` 캐스팅으로 검증을 우회하지 않았는가?
- [ ] 실패 시 사용자/로직 처리 경로가 있는가?
- [ ] 테스트가 정상/실패 둘 다 다루는가?

## 추천 스키마 위치

- 폼 전용: 해당 화면 `_src/schema` 또는 `schema/`
- 서비스 응답: 해당 `services/*` 근처 `*.schema.ts`
- 공용 파라미터: `lib/` 또는 도메인 공용 스키마 파일

## 예시 패턴

```ts
const QuerySchema = z.object({
  productId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
});

const parsed = QuerySchema.safeParse(rawQuery);
if (!parsed.success) {
  return { ok: false, reason: "invalid_query" };
}

// parsed.data only
```
