import type { Page } from "@sveltejs/kit";

/** 테스트용 `$app/state` page. kit.ts 가 이동마다 값을 바꾼다 */
export const page = $state({
  url: new URL("http://localhost/"),
  params: {},
  route: { id: "/" },
  data: {},
  form: null,
  status: 200,
  error: null,
  state: {},
}) as Page;
