import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@dnd-kit/core': '/node_modules/@dnd-kit/core/dist/index.js',
    },
  },
})