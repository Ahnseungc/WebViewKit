<script lang="ts">
  import { useStackPage } from "../context.js";

  let { data, params }: { data: { id: string }; params: { id: string } } =
    $props();
  const page = useStackPage();
</script>

<p data-testid={`detail-${params.id}`}>
  {params.id}|{page.params.id}|{page.url.pathname}|{data.id}
</p>
