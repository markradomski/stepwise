/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { explainApiPlugin } from './server/vitePlugin';

// Server-only variables (LLM_API_KEY and friends) are read here, never exposed to client code.
export default defineConfig(({ mode }) => ({
  plugins: [react(), explainApiPlugin(loadEnv(mode, '.', ''))],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
}));
