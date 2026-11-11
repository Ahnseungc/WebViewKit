/**
 * `@ahnseungchan/webviewkit/vue-router` — Vue Router 4·5 (Nuxt 3·4 포함) 위에 스택 전환을 얹는다.
 * URL·history·데이터(SSR 포함)는 Vue Router·Nuxt 가 맡고, `<StackRouterView>` 는 페이지를
 * history 항목별로 쌓아 iOS 식 push/pop 으로 그린다. 이동은 `<RouterLink>`·`<NuxtLink>`·`router.push` 그대로 쓴다.
 */
export { useStack, type VueRouterStack } from "./vue-router/context";
export {
  StackRouterView,
  type StackRouterViewSlotProps,
} from "./vue-router/stack-router-view";
