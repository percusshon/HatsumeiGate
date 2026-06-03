/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    dirs: ['app', 'components', 'lib']
  },
  // 透かし用フォント（assets/fonts）をファイル配信ルートのサーバーバンドルに含める。
  experimental: {
    outputFileTracingIncludes: {
      '/company/inventions/[id]/files/[fileId]': ['./assets/fonts/**']
    }
  }
};

export default nextConfig;
