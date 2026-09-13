import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    // Keep images and fonts separately cacheable, including the small portrait.
    assetsInlineLimit: 0,
  },
});
