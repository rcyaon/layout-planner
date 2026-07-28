import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves project sites from https://<user>.github.io/<repo>/,
  // so assets must be requested from that subpath. A relative base resolves
  // against whatever path the page is served from, so renaming the repo (or
  // moving to a user page / custom domain at the root) can't break it. Safe
  // here because the app is a single index.html with no client-side router.
  base: './',
  server: { port: 5173, open: true },
});
