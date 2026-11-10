/**
 * `@ahnseungchan/webviewkit/vue` — `/core` 위의 Vue 3 바인딩.
 * 프레임워크 무관 API(history·bridge 등)는 `@ahnseungchan/webviewkit/core` 에서 가져온다
 */
export {
  useActivity,
  useOnRevive,
  useOptionalStackRouter,
  useParams,
  useStackRouter,
  type VueStackRouter,
} from "./vue/context";
export { BackRouter, StackHeader } from "./vue/header";
export { StackRouter, type VueActivity } from "./vue/stack-router";
