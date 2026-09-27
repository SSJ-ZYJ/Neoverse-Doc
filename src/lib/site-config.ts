// Site-wide constants (single source of truth).
// Centralizes third-party service configs and repository URLs so they can be
// referenced from both server and client code without re-declaring literals.
// 站点级常量（唯一来源）。
// 集中管理第三方服务配置与仓库地址，便于服务端 / 客户端统一引用，避免字面量重复。

// GitHub repository URL — shared by layout nav link and Giscus config.
// GitHub 仓库地址，布局导航链接与 Giscus 配置共用。
export const REPO_URL = 'https://github.com/SSJ-ZYJ/Neoverse-Doc';

// Canonical production origin — shared by metadata, sitemap, robots, and JSON-LD.
// 生产环境规范来源，供 metadata、sitemap、robots 与 JSON-LD 共用。
export const SITE_ORIGIN = 'https://docs.shenshijun.space';
export const SITE_URL = new URL(SITE_ORIGIN);

// Shared social preview asset metadata.
// 统一的社交分享预览图元信息。
export const SOCIAL_IMAGE = {
  url: '/opengraph-image.png',
  alt: 'Neoverse-Docs',
  width: 1200,
  height: 630,
} as const;

// Homepage footer project metadata.
// 首页 footer 项目元信息。
export const PROJECT_START_YEAR = 2026;

// ICP filing number — required legal notice for Chinese sites; links to the
// official MIIT record query page.
// 工信部 ICP 备案号，按法规在站点底部展示，链接至官方备案查询页。
export const ICP_FILING_NUMBER = '辽ICP备2025069492号-3';
export const ICP_FILING_URL = 'https://beian.miit.gov.cn/';

// Open-source license references — code uses the MIT License at /LICENSE,
// documentation content is licensed under CC BY-NC-SA 4.0.
// 开源协议引用：代码遵循 /LICENSE 中的 MIT 协议，
// 文档内容遵循 CC BY-NC-SA 4.0 协议。
export const CODE_LICENSE_NAME = 'MIT';
export const CODE_LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const DOCS_LICENSE_NAME = 'CC BY-NC-SA 4.0';
export const DOCS_LICENSE_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';

// Primary author (Shenshijun)
// 主要作者（Shenshijun）
export const AUTHOR_NAME = 'Shenshijun';
export const AUTHOR_GITHUB_ID = 'SSJ-ZYJ';
export const AUTHOR_GITHUB_URL = `https://github.com/${AUTHOR_GITHUB_ID}`;

// Co-author (Collinor)
// 合作者（Collinor）
export const CO_AUTHOR_NAME = 'Collinor';
export const CO_AUTHOR_GITHUB_ID = 'Collinor';
export const CO_AUTHOR_GITHUB_URL = `https://github.com/${CO_AUTHOR_GITHUB_ID}`;

// Giscus configuration — values come from https://giscus.app.
// Giscus 配置，取值来自 https://giscus.app。
export const GISCUS_CONFIG = {
  repo: 'SSJ-ZYJ/Neoverse-Doc',
  repoId: 'R_kgDOSl2-Eg',
  category: 'Announcements',
  categoryId: 'DIC_kwDOSl2-Es4C9t6O',
} as const;

// Both themes share one stylesheet. The Giscus iframe receives the host
// color-scheme, so its `prefers-color-scheme` media query switches colors
// without downloading another CSS asset.
// 浅深主题共用一个样式表。Giscus iframe 会接收宿主的 color-scheme，
// 因此通过 prefers-color-scheme 媒体查询切换颜色，无需重新下载 CSS。
export const GISCUS_THEME_PATHS = {
  light: '/giscus.css',
  dark: '/giscus.css',
} as const;

// Production HTTPS uses the repository's jsDelivr mirror. HTTPS development
// can use the same-origin CORS-enabled asset directly; HTTP development uses a
// short bridge over the existing CDN themes because its iframe cannot load
// local HTTP CSS.
// HTTPS 生产环境使用仓库 jsDelivr 镜像，HTTPS 开发环境可直接使用同源
// CORS 资源；HTTP 开发环境使用已有 CDN 主题的短桥接地址，因为 iframe
// 无法加载本地 HTTP CSS。
const GISCUS_THEME_CDN_BASE_URL = `https://cdn.jsdelivr.net/gh/${GISCUS_CONFIG.repo}@main/public`;
export const GISCUS_THEME_URLS = {
  light: `${GISCUS_THEME_CDN_BASE_URL}${GISCUS_THEME_PATHS.light}`,
  dark: `${GISCUS_THEME_CDN_BASE_URL}${GISCUS_THEME_PATHS.dark}`,
} as const;
// HTTP fallback keeps one short data stylesheet URL and lets the iframe select
// the existing CDN light/dark files through prefers-color-scheme. The stable
// URL avoids reloading the Giscus iframe during a theme switch.
// HTTP 回退使用一个短 data 样式地址，由 iframe 通过 prefers-color-scheme
// 选择已有 CDN 浅色/深色文件，稳定地址可避免主题切换时重载 Giscus iframe。
export const GISCUS_LEGACY_THEME_URL = `data:text/css;charset=utf-8,${encodeURIComponent(
  `@import url("${GISCUS_THEME_CDN_BASE_URL}/giscus-light.css");\n@import url("${GISCUS_THEME_CDN_BASE_URL}/giscus-dark.css") (prefers-color-scheme: dark);`,
)}`;
