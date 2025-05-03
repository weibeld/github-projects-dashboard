import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  base: '/github-projects-dashboard/',
  plugins: [svelte()],
  build: {
    // Output directory for GitHub Pages (temporary)
    outDir: path.resolve(__dirname, 'docs'),
    emptyOutDir: true,
  },
})
