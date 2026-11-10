<script lang="ts">
  import { useActivity, useParams } from "../context.svelte.js";

  const params = useParams<{ id: string }>();
  const activity = useActivity();
</script>

<p data-testid={`detail-${params.current.id}`}>
  {params.current.id}:{activity.current.query.tab ?? ""}
</p>
