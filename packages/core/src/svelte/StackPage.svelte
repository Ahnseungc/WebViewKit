<script lang="ts">
  import { setContext, type Snippet, untrack } from "svelte";
  import {
    getStackPageAttributes,
    hasPendingAnimation,
    isOwnPageAnimation,
    type StackPageLayout,
    type StackTransitionType,
    toActivityInfo,
  } from "../core.js";
  import { ACTIVITY_KEY } from "./context.svelte.js";

  /** 스택 한 장. top 이 아니면 inert·aria-hidden (스크린리더·포커스 차단) */
  interface Props {
    page: StackPageLayout;
    direction: "push" | "pop";
    transition: StackTransitionType;
    duration: number;
    /** 커밋 직후 시작 대기 중인 CSS 애니메이션이 있으면 호출 (enter 페이지만) */
    onanimationpending?: () => void;
    onanimationstarted?: () => void;
    onanimationended?: () => void;
    children?: Snippet;
  }

  let {
    page,
    direction,
    transition,
    duration,
    onanimationpending,
    onanimationstarted,
    onanimationended,
    children,
  }: Props = $props();

  let element: HTMLDivElement;

  setContext(ACTIVITY_KEY, {
    get current() {
      return toActivityInfo(page);
    },
  });

  const attributes = $derived(
    getStackPageAttributes(page, { direction, transition, duration })
  );

  $effect(() => {
    element.toggleAttribute("inert", !page.isTop);
  });

  // 전환(상태·방향)이 바뀔 때만 확인한다
  $effect(() => {
    void page.pageState;
    void direction;
    untrack(() => {
      if (onanimationpending && hasPendingAnimation(element)) {
        onanimationpending();
      }
    });
  });
</script>

<div
  bind:this={element}
  class={attributes.className}
  data-state={attributes["data-state"]}
  data-direction={attributes["data-direction"]}
  data-transition={attributes["data-transition"]}
  aria-hidden={attributes["aria-hidden"]}
  style:z-index={attributes.style.zIndex}
  style:--wvk-duration={attributes.style["--wvk-duration"]}
  onanimationstart={(event) => {
    if (isOwnPageAnimation(event)) onanimationstarted?.();
  }}
  onanimationend={(event) => {
    if (isOwnPageAnimation(event)) onanimationended?.();
  }}
>
  {@render children?.()}
</div>
