---
title: 关于项目
description: 了解 Neoverse-Docs 项目的完整结构与设计理念
author:
  - "Shenshijun(https://github.com/SSJ-ZYJ)"
---

Neoverse-Docs 是一个基于 **Next.js 16** + **React 19** + **fumadocs** 构建的纯静态文档站点，旨在提供具有独特科技美学风格的全终端沉浸式阅读体验。

## 核心特性

- **纯静态生成 (SSG)** — `next build` 直接生成完整 HTML，无需 Node 运行时，可部署至 Vercel、Cloudflare Pages、GitHub Pages 等任意静态托管平台
- **MDX 文档驱动** — Markdown + React 组件混合编写，支持 GFM 表格、任务列表、Mermaid 图表、LaTeX 公式等丰富语法
- **双语 i18n** — 零硬编码的字典式文案管理，覆盖 fumadocs 内置 UI 及项目自定义文案
- **液态玻璃主题** — CSS 变量 + Tailwind v4 实现毛玻璃质感，浅色 / 深色模式全自动适配
- **Giscus 社区互动** — 基于 GitHub Discussions 的留言墙，每篇文档底部内嵌评论区

## 技术栈

| 类别 | 方案 |
| :--- | :--- |
| 框架 | Next.js 16 (Turbopack + App Router) |
| 运行时 | React 19 |
| 文档引擎 | fumadocs-core + fumadocs-ui + fumadocs-mdx |
| 样式 | Tailwind CSS v4 + CSS 变量 |
| 类型检查 | TypeScript 5 (strict) |
| 代码质量 | Biome 2.4 |
