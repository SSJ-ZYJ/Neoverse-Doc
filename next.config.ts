import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

const withMDX = createMDX();

// Local Giscus theme assets need CORS headers because the widget requests them
// from its cross-origin iframe. Production uses the repository CDN mirror.
// 本地 Giscus 主题资源需要 CORS 响应头，因为组件会从跨域 iframe 请求它们；
// 生产环境则使用仓库 CDN 镜像。
const GISCUS_THEME_ASSET_PATHS = ['/giscus-light.css', '/giscus-dark.css'] as const;

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
  // Limit build concurrency and memory for memory-constrained static hosting
  // runners: EdgeOne builds inside a RAM-backed /dev/shm tmpfs, where worker
  // processes, the build filesystem cache and node_modules all compete for
  // the same limited memory. One build worker plus webpack's memory
  // optimizations keep the peak low enough to avoid the OOM (SIGKILL) seen
  // with Turbopack (which peaks at ~10GB and cannot be capped in builds).
  // 限制构建并发与内存：EdgeOne 在内存盘 /dev/shm 中构建，worker、构建期
  // 文件系统缓存与 node_modules 都占用同一份受限内存。单个构建 worker 配合
  // webpack 内存优化可将峰值控制在 ~1.9GB，避免 Turbopack（构建峰值约
  // 10GB 且无法在构建期限流）触发的 OOM（SIGKILL）。
  experimental: {
    cpus: 1,
    webpackMemoryOptimizations: true,
  },
  // Skip webpack's on-disk filesystem cache for production builds: on EdgeOne
  // the cache lands in RAM-backed tmpfs and is never reused (fresh clone per
  // build), so it only wastes memory. Dev builds keep their cache.
  // 生产构建关闭 webpack 磁盘缓存：EdgeOne 每次构建都是全新克隆，缓存写入
  // 内存盘既不会被复用，还白白占用 RAM；本地构建不受影响。
  webpack(config, { dev }) {
    if (!dev) {
      config.cache = false;
    }
    return config;
  },
  ...(process.env.NODE_ENV === 'production'
    ? { output: 'export' as const }
    : {
        async headers() {
          return GISCUS_THEME_ASSET_PATHS.map((source) => ({
            source,
            headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
          }));
        },
      }),
  images: {
    unoptimized: true,
  },
  // Static hosting owns production compression. Disabling Next's development
  // response compressor prevents large MDX payloads from accumulating drain
  // listeners on a shared Gzip stream.
  // 生产压缩由静态托管层负责；开发环境关闭 Next 响应压缩，避免大型 MDX
  // 载荷在共享 Gzip 流上累积 drain 监听器。
  compress: process.env.NODE_ENV === 'production',
  reactStrictMode: true,
};

export default withMDX(nextConfig);
