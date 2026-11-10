<script lang="ts">
  import { getContext, type Snippet } from "svelte";
  import { type ActivityInfo, ensureStackStyles } from "../core.js";
  import BackRouter from "./BackRouter.svelte";
  import {
    ACTIVITY_KEY,
    type Current,
    useStackRouter,
  } from "./context.svelte.js";

  /**
   * 페이지 안에 있으면 그 페이지 기준(제목·back 버튼)으로 그려 페이지와 함께 전환된다.
   * 페이지 밖이면 현재 top 기준. 제목은 `title` 또는 children
   */
  interface Props {
    /** 기본: 이 헤더가 속한 페이지의 path */
    title?: string;
    children?: Snippet;
  }

  let { title, children }: Props = $props();

  ensureStackStyles();
  const activity = getContext<Current<ActivityInfo> | undefined>(ACTIVITY_KEY);
  const router = useStackRouter();
  const path = $derived(activity?.current.path ?? router.currentPath);
  const showBack = $derived(
    activity ? activity.current.index > 0 : router.canGoBack
  );
</script>

<header class="wvk-header">
  {#if showBack}<BackRouter />{/if}
  <h1 class="wvk-header-title">
    {#if children}{@render children()}{:else}{title ?? path}{/if}
  </h1>
</header>
