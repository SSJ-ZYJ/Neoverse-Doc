<div align="center">

# Neoverse-Docs

**一份还在做的文档** · 基于 Next.js 16 + React 19 + fumadocs 构建的静态文档站

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![fumadocs](https://img.shields.io/badge/fumadocs-16.9-FF5C5C)](https://fumadocs.dev)
[![Biome](https://img.shields.io/badge/Biome-2.4-60A5FA?logo=biome&logoColor=white)](https://biomejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

## 目录

- [Neoverse-Docs](#neoverse-docs)
  - [目录](#目录)
  - [项目简介](#项目简介)
  - [功能亮点](#功能亮点)
  - [技术栈](#技术栈)
  - [快速开始](#快速开始)
    - [前置要求](#前置要求)
    - [安装与运行](#安装与运行)
    - [构建部署](#构建部署)
    - [编辑文档](#编辑文档)
  - [项目结构](#项目结构)
  - [核心架构](#核心架构)
    - [路由与布局](#路由与布局)
    - [页面过渡动效](#页面过渡动效)
    - [文档内容层](#文档内容层)
    - [代码块增强](#代码块增强)
    - [可折叠块与 AI 摘要](#可折叠块与-ai-摘要)
    - [Mermaid 图表](#mermaid-图表)
    - [LaTeX 公式渲染](#latex-公式渲染)
    - [搜索系统](#搜索系统)
    - [主题体系](#主题体系)
    - [i18n 体系](#i18n-体系)
    - [渲染管线](#渲染管线)
  - [可用命令](#可用命令)
  - [贡献指南](#贡献指南)
  - [License](#license)

## 项目简介

Neoverse-Docs 是一个面向计算机科班学生与开发者社区的开源文档站，定位为「缺失的一学期」——补齐那些科班课程里很少正式教、却每天都在用的工具与习惯：文件管理、Shell、Git、Docker、Markdown、Mermaid、沟通提问、学习规划等。

项目当前包含以下内容章节：

| 章节 | 主题 | 说明 |
| :--- | :--- | :--- |
| Chapter 0 | 前言 | 项目导引 |
| Chapter 1 | 缺失的一学期 | 计算机基础操作、习惯与沟通、文本与文档、系统与 Shell、工具链、环境配置 |
| Chapter 2 | 算法入门 | 高精度计算等基础算法 |
| 关于 | 项目架构 | i18n、主题、搜索等内部文档 |

## 功能亮点

- **纯静态生成 (SSG)** — `next build` 直接生成完整 HTML，无需 Node 运行时，可部署至 Vercel、Cloudflare Pages、GitHub Pages 等任意静态托管平台
- **MDX 文档驱动** — Markdown + React 组件混合编写，支持 GFM 表格、任务列表、GitHub Alert 风格提示块、可折叠块、AI 摘要打字机、Mermaid 图表、LaTeX 公式等丰富语法
- **增强代码块** — 自动识别顶部注释提取文件路径、顶部横条显示语言图标与复制按钮、Shiki 语法高亮、多语言 Tabs 联动
- **页面过渡动效** — 自研 mask-reveal 径向镂空揭示动画 + page-enter 模糊淡入，由 framer-motion 驱动，按路由组方向不对称切换
- **中文搜索支持** — 使用 Orama Mandarin 分词器，支持中文全文搜索
- **双语 i18n (中文 / 英文)** — 零硬编码的字典式文案管理，覆盖 fumadocs 内置 UI 及项目自定义文案；导航栏右上角内置语言切换器
- **液态玻璃主题** — CSS 变量驱动的毛玻璃效果、全边界点击粒子与移动端按压拖动反馈，深色 / 浅色模式自动适配
- **Giscus 社区互动** — 基于 GitHub Discussions 的留言墙，每个文档页底均内嵌评论区
- **Mermaid 交互图表** — 内置缩放、拖动、重置、视口内放大工具栏，深色模式自动切换
- **实用工具链** — TypeScript 严格模式、Biome 格式化与 Lint、Tailwind CSS v4

## 技术栈

| 类别 | 方案 |
| :--- | :--- |
| 框架 | Next.js 16 (Turbopack + App Router) |
| 运行时 | React 19.2 |
| 文档引擎 | fumadocs-core + fumadocs-ui + fumadocs-mdx |
| 样式 | Tailwind CSS v4 + CSS 变量 + 液态玻璃工具类 |
| 代码高亮 | Shiki (fumadocs 内置) + 自定义 remark/rehype 插件 |
| 搜索 | Orama + @orama/tokenizers (Mandarin 分词) |
| 类型检查 | TypeScript 5 (strict) |
| 代码质量 | Biome 2.4 |
| 动效 | framer-motion 12 |
| 评论 | Giscus (GitHub Discussions) |
| 主题切换 | next-themes |
| 图标 | lucide-react |
| Markdown | remark-github-blockquote-alert (GitHub Alert) + 自定义 remark-collapsible-alert |
| 图表 | Mermaid 11 + fumadocs remarkMdxMermaid 插件 |
| 数学公式 | remark-math 6 + rehype-katex 7 + KaTeX 0.17 |

## 快速开始

### 前置要求

- **Node.js** >= 20
- **Bun** >= 1.0

### 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/SSJ-ZYJ/Neoverse-Doc.git
cd Neoverse-Doc

# 2. 安装依赖（自动执行 fumadocs-mdx 编译）
bun install

# 3. 启动开发服务器
bun dev
```

浏览器打开 `http://localhost:3000` 即可预览。

### 构建部署

```bash
# 生产构建
bun run build

# 启动生产服务器（需先构建）
bun run start

# 产物位于 out/ 目录，可直接部署到任意静态托管平台
```

### 编辑文档

1. 在 `content/docs/{lang}/` 下新建 `.md` 或 `.mdx` 文件
2. 文件头部添加 frontmatter：

   ```md
   ---
   title: 你的标题
   description: 页面描述
   author:
     - "主要作者(https://github.com/your-name)"
   contributors:
     - "贡献者(https://github.com/contributor-name)"
   ---
   ```

   `author` 会在文档开头显示为主要编写者；`contributors` 会在正文末尾显示为本文档贡献者，并兼容单数写法 `contributor`。两者均支持 `Name(https://github.com/name)` 格式以自动显示 GitHub 头像。

3. 在对应目录的 `meta.json` 中注册新页面
4. 如需英文版本，同步在 `content/docs/en/` 创建对应文件
5. 保存后开发服务器自动热更新

## 项目结构

```text
Neoverse-Doc/
├── content/docs/                  # 文档内容（MDX），按语言子目录组织
│   ├── zh/                        # 中文文档子树
│   │   ├── ch0/                   # 前言
│   │   ├── ch1/                   # 缺失的一学期（8 节）
│   │   ├── ch2/                   # 算法入门
│   │   ├── about/                 # 项目架构内部文档
│   │   └── contributing/          # 参与贡献
│   └── en/                        # English document subtree（结构同 zh/）
├── src/
│   ├── app/                       # Next.js App Router 页面
│   │   ├── layout.tsx             # 根布局（<html>/<body> + 全局字体 + ThemeProvider）
│   │   ├── page.tsx               # 根路径客户端重定向到 /{defaultLocale}
│   │   ├── globals.css            # 全局样式入口（@import 模块化样式表）
│   │   ├── api/search/route.ts    # 静态搜索 API（Orama + Mandarin 分词）
│   │   └── [lang]/                # 语言段（zh / en）
│   │       ├── layout.tsx         # RootProvider 注入 i18nProvider + MaskReveal
│   │       ├── (home)/            # 主页路由组（独立布局）
│   │       │   ├── layout.tsx     # HomeLayout 包裹
│   │       │   ├── (index)/page.tsx # 首页（品牌入口 + 进入文档按钮）
│   │       │   ├── template.tsx   # page-enter 动画模板（framer-motion）
│   │       │   └── guestbook/page.tsx # 独立留言墙页面
│   │       └── docs/              # 文档路由组
│   │           ├── layout.tsx     # DocsLayout（侧栏 + 正文 + 目录）
│   │           ├── template.tsx   # 文档模板（无动画，因 fumadocs CSS Grid 约束）
│   │           └── [...slug]/page.tsx # 文档正文（MDX + Mermaid + Giscus）
│   ├── components/
│   │   ├── transition/            # 页面过渡与遮罩揭示动画组件
│   │   │   ├── mask-reveal.tsx       # 遮罩揭示径向扩展动画
│   │   │   ├── enter-docs-button.tsx # 首页进入文档按钮
│   │   │   ├── back-link.tsx         # 返回链接组件
│   │   │   ├── docs-transition.tsx   # 文档正文稳定包装器
│   │   │   └── nav-title.tsx         # 导航栏品牌标题
│   │   ├── mdx/                   # MDX 内容渲染组件
│   │   │   ├── custom-codeblock.tsx  # 增强代码块（文件路径 + 复制按钮）
│   │   │   ├── code-tabs.tsx         # 多语言 Tabs 联动组件
│   │   │   ├── collapsible-details.tsx # 可折叠块 + AI 打字机渲染
│   │   │   ├── mermaid.tsx           # Mermaid 图表渲染（缩放 / 拖动 / 最大化）
│   │   │   └── docs-author.tsx       # 文档作者与贡献者展示
│   │   ├── guestbook.tsx          # Giscus 评论组件（按 locale 切换语言）
│   │   ├── glass-ripple-controller.tsx # 全局玻璃控件点击粒子控制器
│   │   ├── search.tsx             # 静态搜索对话框（Orama + Mandarin 分词）
│   │   ├── home-footer.tsx        # 首页 footer（仓库 / Git / 作者元信息）
│   │   ├── sidebar-provider.tsx   # 侧栏折叠状态持久化 Provider
│   │   └── localized-*.tsx        # 本地化 404 / 错误 / 加载组件
│   ├── dictionaries/              # i18n 语言包
│   │   ├── index.ts               # Dictionary 契约 + getPageDictionary(locale)
│   │   ├── zh.ts                  # 中文语言包
│   │   └── en.ts                  # 英文语言包
│   ├── lib/
│   │   ├── i18n.ts                # 集中式 i18n 配置（defineI18n，唯一来源）
│   │   ├── source.ts              # fumadocs 内容源加载器（i18n parser: 'dir'）
│   │   ├── layout.shared.tsx      # fumadocs UI 翻译 + i18nProvider + baseOptions
│   │   ├── site-config.ts         # 站点级常量（仓库 / 作者 / Giscus 配置）
│   │   ├── motion.ts              # framer-motion 动画预设
│   │   ├── transition-snapshot.ts # 路由过渡快照工具（mask-reveal 协议）
│   │   ├── parse-author.ts        # 作者 / 贡献者信息解析器
│   │   ├── code-title.ts          # 代码块路径提取工具
│   │   ├── language-mapping.ts    # 编程语言显示名映射
│   │   ├── remark-code-title.ts   # Remark 插件：代码顶部注释提取文件路径
│   │   ├── remark-collapsible-alert.ts # Remark 插件：[!DETAILS] 系列折叠块
│   │   ├── transformer-meta-title.ts   # Shiki transformer：meta.title 映射
│   │   ├── git-info.ts            # Git 提交信息读取（构建时）
│   │   ├── route-locale.ts        # 路由语言段解析
│   │   ├── route-loading-handoff.ts # 路由加载状态交接
│   │   ├── search-tokenizer.ts    # 搜索分词器配置
│   │   └── hooks/                 # Mermaid / 缩放 / 视口相关 React Hooks
│   └── styles/                    # 模块化 CSS 样式表
│       ├── theme.css              # Tailwind/fumadocs 导入、主题变量、色彩系统
│       ├── glass.css              # 液态玻璃设计系统（工具类 + 环境光）
│       ├── fumadocs-glass.css     # Fumadocs 表面玻璃化覆盖
│       ├── typography.css         # 代码块、引用块、提示框、行内代码
│       ├── home.css               # 首页渐变动画
│       ├── mermaid.css            # Mermaid 图表样式
│       ├── loading.css            # 路由加载样式
│       ├── ripple.css             # 沉浸光场与点击粒子动效
│       └── a11y.css               # 无障碍（减少动画 / 减少透明度 / 回退）
├── .github/ISSUE_TEMPLATE/        # GitHub Issue 模板（bug / feature / content）
├── .vscode/prompt/                # Commit 规范指引
├── source.config.ts               # fumadocs-mdx 配置（remark/rehype 插件注册）
├── next.config.ts                 # Next.js 配置（静态导出 + MDX 插件）
├── biome.json                     # Biome 格式化与 Lint 规则
├── tsconfig.json                  # TypeScript 配置
├── postcss.config.mjs             # PostCSS / Tailwind CSS 配置
├── AGENTS.md                      # AI Agent 协作准则
├── CONTRIBUTING.MD                # 贡献指南
└── LICENSE                        # MIT License
```

## 核心架构

### 路由与布局

项目采用 **路由组** 分离不同布局：

- `(home)` 路由组：首页 + 留言墙，使用 `HomeLayout`（顶部导航栏）
- `docs` 路由组：文档页面，使用 `DocsLayout`（侧栏 + 正文 + 目录）

这种分离避免了文档页面同时出现顶部 navbar 和左侧 sidebar 的功能重复问题。

```text
src/app/[lang]/
├── (home)/         → HomeLayout（顶部 navbar）
│   ├── (index)/    → 首页
│   └── guestbook/  → 留言墙
└── docs/           → DocsLayout（侧栏 + 正文 + 目录）
    └── [...slug]/  → 文档正文
```

### 页面过渡动效

项目实现了自研的「遮罩揭示（mask-reveal）」页面过渡系统，由 framer-motion 驱动：

- **mask-reveal（径向镂空揭示）** — 从点击坐标向外扩展 `radial-gradient` 裁剪动画，内圈揭示目标页，外圈展示来源页快照
- **page-enter（模糊淡入）** — `opacity 0→1 + scale 0.96→1 + blur 8px→0`，时长 0.65s

过渡方向 **不对称** 设计，由 `isCrossRouteGroupTransition()` 决定：

| 方向 | 动画 | 实现 |
| :--- | :--- | :--- |
| home → docs | mask-reveal | `EnterDocsButton` 捕获快照 |
| guestbook → docs | mask-reveal | `BackLink` 捕获快照 |
| docs → home | page-enter (blur) | 全局 click 捕获跳过，目标页 template 播放 |
| docs → guestbook | page-enter (blur) | 同上 |

关键文件：

- [src/components/transition/mask-reveal.tsx](src/components/transition/mask-reveal.tsx) — 遮罩揭示动画组件
- [src/lib/transition-snapshot.ts](src/lib/transition-snapshot.ts) — 快照工具 + 路由组分类
- [src/lib/motion.ts](src/lib/motion.ts) — 动画预设

### 文档内容层

所有文档以 MDX 格式存放在 `content/docs/` 下，按章节分目录。每个目录内的 `meta.json` 定义章节标题、分段分隔符（`---分段标题---`）和页面渲染顺序。`fumadocs-mdx` 在 `postinstall` / `build` 时自动将这些文件编译为类型安全的代码生成产物，存放在 `.source/` 目录中。

```text
content/docs/zh/ch1/
├── meta.json      →  { "title": "Chapter 1：缺失的一学期", "pages": [...] }
├── index.md       →  章节导读
├── 1.1-os-essentials.md
├── 1.2-os-and-shell.md
└── ...
```

frontmatter schema 在 [source.config.ts](source.config.ts) 中通过 `pageSchema.extend()` 声明，支持 `author` / `contributor` / `contributors` 字段（兼容单数与复数）。

### 代码块增强

项目实现了增强的代码块渲染，支持：

1. **自动识别文件路径** — 从代码顶部注释（`// path/to/file.tsx`、`/* path */`、`# path`、`<!-- path -->`）提取文件路径
2. **顶部横条显示** — 所有代码块都有顶部横条，显示语言图标 + 文件路径（可选）+ 复制按钮
3. **一键复制** — 内置复制按钮，点击后显示 ✓ 反馈
4. **多语言 Tabs** — `<Tabs>` 组件支持 `groupId` 联动 + `persist` 跨页面记忆，语言选择与内部代码块共享完整的点击粒子表面

实现架构（三层管道）：

```text
MDX 代码块 → remarkCodeTitle（提取路径，注入 meta="title=..."）
    → fumadocs parseMetaString（解析 meta，提取 title）
    → Shiki codeToHast（语法高亮 + transformerIcon）
    → transformerMetaTitle（设置 pre.properties.title）
    → CustomCodeBlock → CodeBlock（显示标题栏 + 复制按钮）
```

关键文件：

- [src/lib/remark-code-title.ts](src/lib/remark-code-title.ts) — Remark 插件
- [src/lib/transformer-meta-title.ts](src/lib/transformer-meta-title.ts) — Shiki transformer
- [src/components/mdx/custom-codeblock.tsx](src/components/mdx/custom-codeblock.tsx) — React 组件
- [src/components/mdx/code-tabs.tsx](src/components/mdx/code-tabs.tsx) — 多语言 Tabs

### 可折叠块与 AI 摘要

通过自定义 Remark 插件 [src/lib/remark-collapsible-alert.ts](src/lib/remark-collapsible-alert.ts) 扩展 GitHub Alert 语法，支持 `[!DETAILS]` 系列可折叠块：

| 语法 | 用途 |
| :--- | :--- |
| `[!DETAILS]` / `[!DETAILS+]` | 通用折叠块（`+` 默认展开） |
| `[!DETAILS-FAQ]` | 常见问题 |
| `[!DETAILS-ANSWER]` | 答案（配合 FAQ） |
| `[!DETAILS-EXAMPLE]` | 示例 |
| `[!DETAILS-HINT]` | 提示 |
| `[!DETAILS-AI]` | AI 生成摘要（展开后自适应打字机揭示） |

```md
> [!DETAILS-AI] AI 生成摘要
>
> 这里填写 AI 生成的摘要正文。
```

### Mermaid 图表

Mermaid 11 通过 `fumadocs-core/mdx-plugins` 的 `remarkMdxMermaid` 接入，渲染端 [src/components/mdx/mermaid.tsx](src/components/mdx/mermaid.tsx) 提供交互工具栏：

- 缩放（滚轮 + 按钮）
- 拖动平移
- 重置缩放
- 视口内最大化（Portal 弹层）
- 深色模式自动切换

工具栏文案从共享字典读取，无障碍标签齐全。全局点击粒子使用宿主直属裁剪层并同步控件圆角；组合工具栏仅共享视觉反馈，不接管内部按钮事件；Mermaid 最大化画布与粒子宿主隔离，触发反馈不会改变图表或工具栏布局。

### LaTeX 公式渲染

项目通过 `remark-math`、`rehype-katex` 与 `katex/dist/katex.css` 接入数学公式渲染，支持行内公式 `$...$` 与块级公式 `$$...$$`：

```md
行内公式：$E = mc^2$

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$
```

### 搜索系统

采用 **Orama 静态搜索**，支持中文全文搜索：

- **服务端**：[src/app/api/search/route.ts](src/app/api/search/route.ts) 使用 `createFromSource` + `localeMap` 配置 Mandarin 分词器
- **客户端**：[src/components/search.tsx](src/components/search.tsx) 使用 `useDocsSearch` + `initOrama` 按 locale 动态选择分词器

```typescript
// 中文 locale 使用 Mandarin 分词器
import { createTokenizer } from '@orama/tokenizers/mandarin';

localeMap: {
  zh: {
    components: { tokenizer: createTokenizer() },
    search: { threshold: 0, tolerance: 0 },
  },
  en: { language: 'english' },
}
```

### 主题体系

[src/app/globals.css](src/app/globals.css) 作为全局样式入口，通过 `@import` 聚合模块化样式表，遵循「变量层 → 工具类 → 组件覆写」三段式架构：

```text
src/styles/
├── theme.css              # 变量层：CSS 自定义属性（--background / --glass-bg / --color-fd-* 等）
├── glass.css              # 工具类：.glass-panel / .glass-card / .glass-chip（全局可复用的毛玻璃效果）
├── fumadocs-glass.css     # 组件覆写：fumadocs-ui CSS 预设 + CSS 变量映射
├── typography.css         # 排版：代码块、引用块、提示框、行内代码
├── home.css               # 首页：渐变背景动画
├── mermaid.css            # Mermaid：图表样式
├── loading.css            # 路由加载样式
├── ripple.css             # 沉浸光场与点击粒子动效
└── a11y.css               # 无障碍：减少动画 / 减少透明度 / 回退
```

通过 Tailwind v4 的 `@theme inline` 将 CSS 变量映射为 Tailwind token，在 JSX 中可直接使用 `bg-background`、`text-foreground` 等语义化工具类。`next-themes` 通过 `class` 属性驱动 CSS 变量切换，实现浅色 / 深色模式全自动适配。

字体策略：

- **Orbitron** — 仅用于 Logo（通过 `--font-orbitron` CSS 变量）
- **Noto Sans SC** — 正文默认字体
- **Maple Mono NF CN** — 代码块字体（CDN 加载）

### i18n 体系

UI 文案分为两层管理：

- **fumadocs UI 翻译**：由 [src/lib/layout.shared.tsx](src/lib/layout.shared.tsx) 中的 `i18n.translations().extend(uiTranslations()).add('ui', {...})` 管理
- **页面自定义文案**：由 [src/dictionaries/](src/dictionaries/index.ts) 管理，所有键受 `Dictionary` 接口约束

[src/lib/i18n.ts](src/lib/i18n.ts) 通过 `defineI18n` 集中声明语言列表与默认语言，作为 i18n 配置的唯一来源，被 source loader 与 fumadocs-ui 翻译共用。

根级、语言级和文档区的 404 回退页复用 [src/components/localized-not-found.tsx](src/components/localized-not-found.tsx)，根据当前路由中的 `lang` 段读取字典；没有语言段时回退到默认语言。

### 渲染管线

```text
next.config.ts (createMDX)
  → source.config.ts (defineDocs + remarkCollapsibleAlert + remarkGithubBlockquoteAlert
                       + remarkMath + remarkMdxMermaid + remarkCodeTitle
                       + rehypeKatex + transformerMetaTitle)
    → .source/ (fumadocs-mdx 编译产物)
      → src/lib/source.ts (loader + i18n parser:'dir' → Record<lang, pageTree>)
        → src/app/[lang]/docs/layout.tsx (DocsLayout, tree=pageTree[lang])
          → src/app/[lang]/docs/[...slug]/page.tsx (DocsPage + MDX + CustomCodeBlock + Mermaid + Guestbook)
```

## 可用命令

| 命令 | 说明 |
| :--- | :--- |
| `bun dev` | 启动开发服务器 (Turbopack) |
| `bun run build` | 生产构建（输出至 `out/`） |
| `bun run start` | 启动生产服务器（需先构建） |
| `bun run typecheck` | TypeScript 类型检查（含 next typegen + fumadocs-mdx） |
| `bun run lint` | Biome Lint |
| `bun run format` | Biome 格式化 |
| `bun run check` | Biome 格式化 + Lint + 自动修复 |

## 贡献指南

欢迎为项目做出贡献！详细的贡献指南请参阅 [CONTRIBUTING.MD](CONTRIBUTING.MD)。

```bash
# 1. Fork 并克隆项目
git clone https://github.com/<your-username>/Neoverse-Doc.git
cd Neoverse-Doc

# 2. 安装依赖
bun install

# 3. 创建功能分支
git checkout -b feat/your-feature

# 4. 开发完成后提交
bun run check && bun run typecheck
git commit -m "feat(scope): 功能描述"

# 5. 推送并创建 Pull Request
git push origin feat/your-feature
```

提交信息格式：`<修改类型>(<作用域>): <修改的内容>`，详见 [.vscode/prompt/commit-instruction.md](.vscode/prompt/commit-instruction.md)。

## License

[MIT](LICENSE) © 2026 [Shenshijun](https://github.com/SSJ-ZYJ)
