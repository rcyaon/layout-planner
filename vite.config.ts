import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves project sites from https://<user>.github.io/<repo>/,
  // so assets must be requested from that subpath. Change this to match your
  // repo name. (Tip: use base: './' to make it repo-name-agnostic, or '/' if
  // you deploy to a user/org page or a custom domain at the root.)
  base: '/ic-layout-planner/',
  server: { port: 5173, open: true },
});
