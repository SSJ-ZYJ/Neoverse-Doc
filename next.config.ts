import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

const withMDX = createMDX();

// Enable `output: 'export'` only for production builds. In dev, static-export
// disables Next's default not-found fallback for unknown paths and instead
// throws "missing param ... in generateStaticParams()" (next dev still goes
// through the App Router param check). Skipping it locally lets unmatched
// URLs render the not-found page as expected without changing the production
// artifact.
// 仅在生产构建启用 `output: 'export'`：开发模式下静态导出会让任何未在
// generateStaticParams 中预生成的路径直接抛 "missing param" 错，无法走 not-found
// 兜底。dev 下关闭它即可保留正常的 404 行为，生产产物仍是纯静态导出。
const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default withMDX(nextConfig);
