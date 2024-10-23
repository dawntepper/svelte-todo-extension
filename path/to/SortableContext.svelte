<script context="module" lang="ts">
  export type Props = {
    items: any[];
    strategy: any;
    disabled?: boolean;
  };
</script>

<script lang="ts">
  import { SvelteComponentTyped } from "svelte";

  class SortableContext extends SvelteComponentTyped<Props> {}
</script>
