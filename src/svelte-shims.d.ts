declare namespace svelteHTML {
  import type { HTMLAttributes } from 'svelte/elements';
  type HTMLAttributesSubset<K extends keyof HTMLAttributes> = {
    [key in K]?: HTMLAttributes[K];
  };
}