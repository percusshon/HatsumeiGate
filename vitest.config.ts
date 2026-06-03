import { defineConfig } from 'vitest/config';
import path from 'node:path';

// アプリ層のロジックを対象としたユニットテスト設定。
// '@/*' エイリアスを tsconfig と合わせ、Node 環境で実行する。
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    globals: false
  }
});
