import { execFileSync } from 'node:child_process';
import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

const withMDX = createMDX();

// Local Giscus theme assets need CORS headers because the widget requests them
// from its cross-origin iframe. Production uses the repository CDN mirror.
// 本地 Giscus 主题资源需要 CORS 响应头，因为组件会从跨域 iframe 请求它们；
// 生产环境则使用仓库 CDN 镜像。
const GISCUS_THEME_ASSET_PATHS = ['/giscus-light.css', '/giscus-dark.css'] as const;

function resolveDeploymentId(): string | undefined {
  const configuredId = process.env.NEXT_DEPLOYMENT_ID?.trim();

  if (configuredId) return configuredId;
  if (process.env.NODE_ENV !== 'production') return undefined;

  try {
    return (
      execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
        encoding: 'utf8',
      }).trim() || undefined
    );
  } catch {
    // Direct uploads may not include a Git checkout; allow the build to proceed.
    return undefined;
  }
}

const deploymentId = resolveDeploymentId();

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
  ...(deploymentId ? { deploymentId } : {}),
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
  reactStrictMode: true,
};

export default withMDX(nextConfig);
