<script lang="ts">
  import { useStackRouter } from "../context.svelte.js";
  import { probe } from "./probe.js";

  probe.router = useStackRouter();
</script>

<p data-testid="home">home</p>
