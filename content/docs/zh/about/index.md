---
title: 关于项目
description: 了解 Neoverse-Doc 项目的完整结构与设计理念
author:
  - "Shenshijun(https://github.com/SSJ-ZYJ)"
---

Neoverse-Doc 是一个基于 **Next.js 16** + **React 19** + **fumadocs** 构建的纯静态文档站点，旨在提供具有独特科技美学风格的全终端沉浸式阅读体验。

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

## 章节地图

### Chapter 0 — 那些你应该知道的东西

面向计算机类专业新生的基础常识与入门指南。

- [前言](../ch0)：项目建立的初衷、内容涵盖范围与文档结构说明

### 参与贡献

与我们一起共建 Neoverse-Doc！

- [如何参与贡献](../contributing)：贡献入口与概览
- [贡献指南](../contributing/guide)：完整的代码规范、提交规范与 PR 流程
- [Markdown 语法示例](../contributing/syntax-example)：GFM、LaTeX 公式与 Mermaid 图表语法参考

### 项目架构

深入了解 Neoverse-Doc 的内部机制。

- [i18n 国际化](./i18n)：多语言架构、语言包结构与文案管理方案
- [玻璃感主题](./theming)：CSS 变量层、`@theme inline` 与暗色模式接入
- [搜索与索引](./search)：fumadocs-core 内建搜索的接入与静态导出适配
