<script lang="ts">
  import { type Component, setContext, type Snippet } from "svelte";
  import { STACK_PAGE_KEY } from "./context.js";
  import type { StackPageSnapshot } from "./types.js";

  /** 스택 한 장의 내용. 페이지 컴포넌트에 이 페이지의 고정된 data·form·params 를 넘긴다 */
  interface Props {
    snapshot: StackPageSnapshot;
    component?: Component<any>;
    /** component 가 없을 때 (등록 안 된 route·에러 화면) */
    fallback?: Snippet;
  }

  let { snapshot, component, fallback }: Props = $props();

  setContext<StackPageSnapshot>(STACK_PAGE_KEY, {
    get url() {
      return snapshot.url;
    },
    get params() {
      return snapshot.params;
    },
    get route() {
      return snapshot.route;
    },
    get data() {
      return snapshot.data;
    },
    get form() {
      return snapshot.form;
    },
    get status() {
      return snapshot.status;
    },
    get error() {
      return snapshot.error;
    },
    get state() {
      return snapshot.state;
    },
  });

  const Page = $derived(component);
</script>

{#if Page}
  <Page data={snapshot.data} form={snapshot.form} params={snapshot.params} />
{:else}
  {@render fallback?.()}
{/if}
