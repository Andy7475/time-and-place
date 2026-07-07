import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/,
// so assets must be requested from that sub-path. Locally (dev/preview) we
// want the root, so only apply the sub-path for production builds.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/time-and-place/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
  },
}));
