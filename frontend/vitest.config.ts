import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Expose test APIs globally so Testing Library's auto-cleanup registers
    // (without this, renders accumulate across tests in a file).
    globals: true,
    // Auth security tests assert exact outbound request counts (e.g. a
    // single shared refresh); never retry — a flake would hide a real bug.
    retry: 0,
  },
});
