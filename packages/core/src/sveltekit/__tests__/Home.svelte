<script lang="ts">
  import { useStack } from "../context.js";
  import { probe } from "./probe.js";

  probe.stack = useStack();
</script>

<p data-testid="home">home</p>
