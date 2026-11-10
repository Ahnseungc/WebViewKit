<script lang="ts">
  import { useOnRevive } from "../context.svelte.js";
  import { probe } from "./probe.js";

  // keepAlive 페이지: 입력값(state)이 보관·되살리기에서 유지되는지 본다
  let draft = $state("");
  useOnRevive((data) => probe.revived.push(data));
</script>

<input data-testid="list" bind:value={draft} />
