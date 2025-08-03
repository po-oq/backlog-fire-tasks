import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // ReactコンポーネントテストのためDOMをシミュレート
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'], // .tsxファイルも含める
    setupFiles: ['./tests/setup.ts'], // テスト共通のセットアップファイル
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'tmp/',
        'bin/',
        '*.config.ts'
      ]
    }
  }
});