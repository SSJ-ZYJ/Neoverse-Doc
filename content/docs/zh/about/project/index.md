---
id: about/project
title: 项目总览
description: 了解 Neoverse-Docs 的定位、当前内容、工程原则与技术专题
author:
  - "Shenshijun(https://github.com/SSJ-ZYJ)"
---

> [!DETAILS-AI] 本章 AI 摘要
> Neoverse-Docs 是一份面向计算机相关专业学生的开源在线学习文档，也是一个围绕 Fumadocs 深度定制的静态文档站。项目坚持内容优先、Static-first、Server-first 与 Fumadocs-first，并通过七个技术专题说明项目结构、内容增强、设计系统、首页与沉浸式交互、搜索导航、路由转场以及 Mermaid 与性能取舍。

## 一、项目定位

Neoverse-Docs 主要服务于缺少实际计算机使用与开发工具基础的计算机相关专业学生，也兼顾希望补齐工具链短板的自学者和开发者。

项目关注传统课程经常默认、真实学习与开发中又会频繁使用的实践能力，例如文件管理、搜索与提问、文本表达、Shell、开发环境、Git 和 Docker。它是一份持续更新的在线学习文档，不是结构固定的电子书，也暂时不是完整的编程语言、算法或计算机理论课程。

工程层面的目标同样明确：内容必须可以静态部署，核心阅读不依赖长期运行的后端；视觉和交互只能增强内容，不能让长文档承担不必要的 JavaScript、网络或 GPU 成本。

## 二、当前内容

| 内容 | 状态 | 说明 |
| :--- | :--- | :--- |
| [Chapter 0：开始之前](/zh/docs/ch0) | 已可阅读 | 介绍项目、学习方式与站点操作 |
| [Chapter 1：缺失的一学期](/zh/docs/ch1) | 当前主线 | 共 7 个 Stage、17 节，从日常工具逐步进入 Shell、开发环境、Git 与 Docker |
| [Chapter 2：算法入门](/zh/docs/ch2) | 建设中 | 当前只有导读与高精度算法草稿，现有示例要求 C++ 基础 |
| [关于与共建](/zh/docs/about) | 持续维护 | 记录项目理念、技术实现、贡献流程与作者参考 |

当前内容与未来方向会随着实际写作和反馈调整。导航中出现某个章节，不代表它已经达到与 Chapter 1 相同的完整度。

## 三、工程原则

### 内容优先

阅读和理解始终比装饰更重要。提示框、任务进度、图表、动效与评论只用于组织内容或完成学习动作，不应成为正文的负担。

### Static-first

生产环境通过 `output: 'export'` 输出完整静态站点。核心阅读、搜索端点、文档源码和多语言路由都可以由构建产物提供，不引入数据库或账号系统。

### Server-first

React 组件默认保持为 Server Component。只有状态、交互或浏览器 API 确实需要时才建立小型客户端边界，避免把长文章或整棵组件树客户端化。

### Fumadocs-first

页面树、MDX、目录、搜索和国际化优先使用 Fumadocs 的公开能力。项目扩展集中在内容 Schema、Remark / Rehype 管线和显式组件 API 上。

### 渐进增强

正文、搜索索引与 Mermaid SVG 都能在构建期生成。任务持久化、缩放拖拽、评论和页面转场建立在静态内容之上；某项增强不可用时，不应阻断文章阅读。

## 四、技术专题

技术实现按职责分成七篇，覆盖工程、内容、视觉与交互四个层面：

| 专题 | 主要内容 |
| :--- | :--- |
| [项目结构与静态构建](./project/architecture) | 仓库目录、路由布局、内容源、编译管线、静态导出、站点配置与 MDX Preview |
| [内容管线与 MDX 增强](./project/content-engineering) | Frontmatter Schema、MDX 组件、代码块、折叠块、任务、文件层级、文档卡片、Remark 插件与客户端边界 |
| [设计系统与主题](./project/design-system) | 语义 Token、Glass 视觉体系、主题切换、Motion 分级与无障碍降级 |
| [首页与沉浸式交互](./project/home-and-immersive) | 首页视觉构成、环境动效、章节卡片、沉浸式粒子、TOC 滚动条与动效偏好 |
| [搜索、导航与社区](./project/search-navigation) | 中英混合与拼音搜索、结果增强、章节范围、阅读返回、源码端点、i18n 与 Giscus |
| [路由转场系统](./project/transitions) | 五种转场语义、非对称行为、DOM 克隆、content 粒子转场与 contain 隔离 |
| [Mermaid 与性能](./project/mermaid-performance) | 构建期图表、缩放交互、工具栏、性能策略与移动端降级 |

面向贡献者的操作约束以 [贡献指南](./contributing) 为准；Markdown 与 MDX 作者写法集中在 [语法与组件参考](./contributing/syntax-example)。

## 五、技术栈快照

版本以 `package.json` 为准：

| 类别 | 当前方案 |
| :--- | :--- |
| 框架 | Next.js 16.3（App Router + Turbopack） |
| 运行时 | React 19.2 |
| 文档引擎 | fumadocs-core / fumadocs-ui 16.14，fumadocs-mdx 15.2 |
| 语言与类型 | TypeScript 6.0（strict） |
| 样式 | Tailwind CSS 4.3 + CSS 变量 |
| 搜索 | Orama、zbsearch、`@orama/tokenizers` |
| 图表与公式 | Mermaid 11.16、KaTeX 0.18 |
| 代码质量 | Biome 2.5 |
| 包管理与脚本 | Bun |
| 评论 | Giscus + GitHub Discussions |

## 六、开放方式

项目源码托管在 [GitHub](https://github.com/SSJ-ZYJ/Neoverse-Doc)。代码使用 MIT License，文档内容使用 CC BY-NC-SA 4.0。

README 提供仓库级功能总览，本组技术专题则解释这些能力为什么存在、如何组合，以及它们在静态导出边界下做出了哪些取舍。
