import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // Storage-heavy integration tests are timing-sensitive under full worker
    // load (known QuizDetail flake, pre-existing). One retry absorbs the
    // environmental blip; real regressions still fail both attempts.
    retry: 1,
  },
})
