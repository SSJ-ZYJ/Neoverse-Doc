// Site-wide constants (single source of truth).
// Centralizes third-party service configs and repository URLs so they can be
// referenced from both server and client code without re-declaring literals.
// 站点级常量（唯一来源）。
// 集中管理第三方服务配置与仓库地址，便于服务端 / 客户端统一引用，避免字面量重复。

// GitHub repository URL — shared by layout nav link and Giscus config.
// GitHub 仓库地址，布局导航链接与 Giscus 配置共用。
export const REPO_URL = 'https://github.com/SSJ-ZYJ/Neoverse-Doc';

// Giscus configuration — values come from https://giscus.app.
// Giscus 配置，取值来自 https://giscus.app。
export const GISCUS_CONFIG = {
  repo: 'SSJ-ZYJ/Neoverse-Doc',
  repoId: 'R_kgDOSl2-Eg',
  category: 'Announcements',
  categoryId: 'DIC_kwDOSl2-Es4C9t6O',
} as const;
