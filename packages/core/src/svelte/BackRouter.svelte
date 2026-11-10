<script lang="ts">
  import { ensureStackStyles } from "../core.js";
  import { useStackRouter } from "./context.svelte.js";

  interface Props {
    /** 스크린리더 라벨 */
    label?: string;
  }

  let { label = "뒤로 가기" }: Props = $props();

  ensureStackStyles();
  const router = useStackRouter();
</script>

<button
  type="button"
  class="wvk-back"
  aria-label={label}
  onclick={() => router.back()}
>
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 20L4 12L12 4"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</button>
