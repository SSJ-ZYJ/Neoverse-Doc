# Neoverse-Doc

基于 **Next.js 16** + **React 19** + **fumadocs** 构建的静态文档站点

## 目录

- [Neoverse-Doc](#neoverse-doc)
  - [目录](#目录)
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
    - [文档内容层](#文档内容层)
    - [代码块增强](#代码块增强)
    - [搜索系统](#搜索系统)
    - [主题体系](#主题体系)
    - [i18n 体系](#i18n-体系)
    - [渲染管线](#渲染管线)
  - [可用命令](#可用命令)
  - [贡献指南](#贡献指南)
    - [快速贡献](#快速贡献)
  - [License](#license)

## 功能亮点

- **纯静态生成 (SSG)** — `next build` 直接生成完整 HTML，无需 Node 运行时，可部署至 Vercel、Cloudflare Pages、GitHub Pages 等任意静态托管平台
- **MDX 文档驱动** — Markdown + React 组件混合编写，支持 GFM 表格、任务列表、Mermaid 图表等丰富语法
- **增强代码块** — 自动识别顶部注释提取文件路径、顶部横条显示语言图标与复制按钮、Shiki 语法高亮
- **中文搜索支持** — 使用 Orama Mandarin 分词器，支持中文全文搜索
- **双语 i18n (中文 / 英文)** — 零硬编码的字典式文案管理，覆盖 fumadocs 内置 UI 及项目自定义文案；导航栏右上角内置语言切换器
- **液态玻璃主题** — CSS 变量驱动的毛玻璃效果，深色/浅色模式自动适配
- **Giscus 社区互动** — 基于 GitHub Discussions 的留言墙，每个文档页底均内嵌评论区
- **实用工具链** — TypeScript 严格模式、Biome 格式化与 Lint、Tailwind CSS v4

## 技术栈

| 类别 | 方案 |
| :--- | :--- |
| 框架 | Next.js 16 (Turbopack + App Router) |
| 运行时 | React 19 |
| 文档引擎 | fumadocs-core + fumadocs-ui + fumadocs-mdx |
| 样式 | Tailwind CSS v4 + CSS 变量 + 液态玻璃工具类 |
| 代码高亮 | Shiki (fumadocs 内置) + 自定义 remark/rehype 插件 |
| 搜索 | Orama + @orama/tokenizers (Mandarin 分词) |
| 类型检查 | TypeScript 5 (strict) |
| 代码质量 | Biome 2.4 |
| 动效 | framer-motion |
| 评论 | Giscus (GitHub Discussions) |
| 主题切换 | next-themes |
| 图标 | lucide-react |
| Markdown | remark-github-blockquote-alert (GitHub Alert) |
| 图表 | Mermaid 11 + fumadocs remarkMdxMermaid 插件 |

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

# 启动生产服务器
bun run start

# 产物位于 out/ 目录，可直接部署到任意静态托管平台
```

### 编辑文档

1. 在 `content/docs/` 下新建 `.md` 或 `.mdx` 文件
2. 文件头部添加 frontmatter：

   ```md
   ---
   title: 你的标题
   description: 页面描述
   ---
   ```

3. 在对应目录的 `meta.json` 中注册新页面
4. 保存后开发服务器自动热更新

## 项目结构

```text
Neoverse-Doc/
├── content/docs/                  # 文档内容（MDX），按语言子目录组织
│   ├── zh/                        # 中文文档子树
│   │   ├── ch0/                   # 前言
│   │   │   ├── index.md
│   │   │   └── meta.json
│   │   ├── about/                 # 项目架构
│   │   │   ├── index.md           # 关于项目
│   │   │   ├── i18n.md            # 国际化方案
│   │   │   ├── theming.md         # 液态玻璃主题
│   │   │   ├── search.md          # 搜索与索引
│   │   │   └── meta.json
│   │   └── contributing/          # 参与贡献
│   │       ├── index.md
│   │       ├── guide.md           # 贡献指南
│   │       ├── syntax-example.md  # Markdown 语法示例
│   │       └── meta.json
│   └── en/                        # English document subtree（结构同 zh/）
│       ├── ch0/
│       ├── about/
│       └── contributing/
├── src/
│   ├── app/                       # Next.js App Router 页面
│   │   ├── layout.tsx             # 根布局（<html>/<body> + 全局字体 + ThemeProvider）
│   │   ├── page.tsx               # 根路径客户端重定向到 /{defaultLocale}
│   │   ├── globals.css            # 全局样式入口（@import 模块化样式表）
│   │   ├── api/
│   │   │   └── search/
│   │   │       └── route.ts       # 静态搜索 API（Orama + Mandarin 分词）
│   │   └── [lang]/                # 语言段（zh / en）
│   │       ├── layout.tsx         # 注入 i18nProvider + 按 locale 生成 metadata
│   │       ├── (home)/            # 主页路由组（独立布局）
│   │       │   ├── layout.tsx     # HomeLayout 包裹
│   │       │   ├── page.tsx       # 首页（品牌入口 + 进入文档按钮）
│   │       │   ├── template.tsx   # 页面过渡动效模板（framer-motion）
│   │       │   └── guestbook/
│   │       │       └── page.tsx   # 独立留言墙页面
│   │       └── docs/              # 文档路由组
│   │       │   ├── layout.tsx     # DocsLayout（侧栏 + 正文 + 目录）
│   │       │   ├── template.tsx   # 页面过渡动效模板
│   │       │   └── [...slug]/
│   │       │       └── page.tsx   # 文档正文（MDX + CustomCodeBlock + Mermaid + Giscus）
│   ├── components/
│   │   ├── transition/            # 页面过渡与遮罩揭示动画组件
│   │   │   ├── docs-transition.tsx   # 文档间切换淡入+上移动画
│   │   │   ├── mask-reveal.tsx       # 遮罩揭示径向扩展动画
│   │   │   ├── enter-docs-button.tsx # 首页进入文档按钮
│   │   │   └── back-link.tsx         # 返回链接组件
│   │   ├── mdx/                   # MDX 内容渲染组件
│   │   │   ├── custom-codeblock.tsx  # 增强代码块组件（文件路径 + 复制按钮）
│   │   │   ├── mermaid.tsx           # Mermaid 图表渲染组件
│   │   │   └── docs-author.tsx       # 文档作者展示组件
│   │   ├── search.tsx             # 静态搜索对话框（Orama + Mandarin 分词）
│   │   ├── guestbook.tsx          # Giscus 评论组件（按 locale 切换语言）
│   │   └── sidebar-provider.tsx   # 侧栏折叠状态持久化 Provider
│   ├── dictionaries/
│   │   ├── index.ts               # 字典聚合 + getPageDictionary(locale)
│   │   ├── zh.ts                  # 中文语言包
│   │   └── en.ts                  # 英文语言包
│   └── lib/
│       ├── i18n.ts                # 集中式 i18n 配置（defineI18n）
│       ├── layout.shared.tsx      # fumadocs UI 翻译 + i18nProvider + baseOptions
│       ├── motion.ts              # framer-motion 动画预设（过渡时长 / 缓动曲线）
│       ├── source.ts              # fumadocs 内容源加载器（含 i18n parser: 'dir'）
│       ├── parse-author.ts        # 作者信息解析器（支持 GitHub URL 提取）
│       ├── remark-code-title.ts   # Remark 插件：从代码顶部注释提取文件路径
│       └── transformer-meta-title.ts  # Shiki transformer：将 meta.title 映射到 pre.properties
│   └── styles/                    # 模块化 CSS 样式表
│       ├── theme.css              # Tailwind/fumadocs 导入、主题变量、色彩系统
│       ├── glass.css              # 液态玻璃设计系统（工具类 + 环境光）
│       ├── fumadocs-glass.css     # Fumadocs 表面玻璃化覆盖
│       ├── typography.css         # 代码块、引用块、提示框、行内代码
│       ├── home.css               # 首页渐变动画
│       └── a11y.css               # 无障碍（减少动画/减少透明度/回退）
├── source.config.ts               # fumadocs-mdx 配置（remark/rehype 插件注册）
├── next.config.ts                 # Next.js 配置（静态导出 + MDX 插件）
├── biome.json                     # Biome 格式化与 Lint 规则
├── tsconfig.json                  # TypeScript 配置
├── postcss.config.mjs             # PostCSS / Tailwind CSS 配置
└── prompt/
    └── commit-instruction.md      # Commit 规范指引
```

## 核心架构

### 路由与布局

项目采用 **路由组** 分离不同布局：

- `(home)` 路由组：首页 + 留言墙，使用 `HomeLayout`（顶部导航栏）
- `docs` 路由组：文档页面，使用 `DocsLayout`（侧栏 + 正文 + 目录）

这种分离避免了文档页面同时出现顶部 navbar 和左侧 sidebar 的功能重复问题。

### 文档内容层

所有文档以 MDX 格式存放在 `content/docs/` 下，按章节分目录。每个目录内的 `meta.json` 定义章节标题和页面渲染顺序。`fumadocs-mdx` 在 `postinstall` / `build` 时自动将这些文件编译为类型安全的代码生成产物，存放在 `.source/` 目录中。

```text
content/docs/
  contributing/
    meta.json      →  { "title": "参与贡献", "pages": ["index", "guide", "syntax-example"] }
    index.md       →  自动生成类型与元信息
```

### 代码块增强

项目实现了增强的代码块渲染，支持：

1. **自动识别文件路径** — 从代码顶部注释（`// path/to/file.tsx`、`/* path */`、`# path`、`<!-- path -->`）提取文件路径
2. **顶部横条显示** — 所有代码块都有顶部横条，显示语言图标 + 文件路径（可选）+ 复制按钮
3. **一键复制** — 内置复制按钮，点击后显示 ✓ 反馈

实现架构（三层管道）：

```text
MDX 代码块 → remarkCodeTitle（提取路径，注入 meta="title=..."）
    → fumadocs parseMetaString（解析 meta，提取 title）
    → Shiki codeToHast（语法高亮）
    → transformerMetaTitle（设置 pre.properties.title）
    → CustomCodeBlock → CodeBlock（显示标题栏 + 复制按钮）
```

关键文件：

- [src/lib/remark-code-title.ts](./src/lib/remark-code-title.ts) — Remark 插件
- [src/lib/transformer-meta-title.ts](./src/lib/transformer-meta-title.ts) — Shiki transformer
- [src/components/mdx/custom-codeblock.tsx](./src/components/mdx/custom-codeblock.tsx) — React 组件

### 搜索系统

采用 **Orama 静态搜索**，支持中文全文搜索：

- **服务端**：[src/app/api/search/route.ts](./src/app/api/search/route.ts) 使用 `createFromSource` + `localeMap` 配置 Mandarin 分词器
- **客户端**：[src/components/search.tsx](./src/components/search.tsx) 使用 `useDocsSearch` + `initOrama` 按 locale 动态选择分词器

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

[src/app/globals.css](./src/app/globals.css) 作为全局样式入口，通过 `@import` 聚合模块化样式表，遵循「变量层 → 工具类 → 组件覆写」三段式架构：

```text
src/styles/
├── theme.css              # 变量层：CSS 自定义属性（--background / --glass-bg / --color-fd-* 等）
├── glass.css              # 工具类：.glass-panel / .glass-card / .glass-chip（全局可复用的毛玻璃效果）
├── fumadocs-glass.css     # 组件覆写：fumadocs-ui CSS 预设 + CSS 变量映射
├── typography.css         # 排版：代码块、引用块、提示框、行内代码
├── home.css               # 首页：渐变背景动画
└── a11y.css               # 无障碍：减少动画 / 减少透明度 / 回退
```

通过 Tailwind v4 的 `@theme inline` 将 CSS 变量映射为 Tailwind token，在 JSX 中可直接使用 `bg-background`、`text-foreground` 等语义化工具类。`next-themes` 通过 `data-theme` 属性驱动 CSS 变量切换，实现浅色 / 深色模式全自动适配。

表格样式增强：深色模式下表头使用淡白色背景（`rgba(255,255,255,0.45)`），确保清晰可见。

### i18n 体系

UI 文案分为两层管理：

- **fumadocs UI 翻译**：由 [src/lib/layout.shared.tsx](./src/lib/layout.shared.tsx) 中的 `i18n.translations().extend(uiTranslations()).add('ui', {...})` 管理
- **页面自定义文案**：由 [src/dictionaries/](./src/dictionaries/index.ts) 管理

[src/lib/i18n.ts](./src/lib/i18n.ts) 通过 `defineI18n` 集中声明语言列表与默认语言，作为 i18n 配置的唯一来源。

[src/app/[lang]/layout.tsx](./src/app/[lang]/layout.tsx) 通过 `RootProvider` 的 `i18n` 属性按路由注入对应翻译：

```typescript
// 使用 i18nProvider 注入翻译
import { i18nProvider } from '@/lib/layout.shared';

<RootProvider
  i18n={i18nProvider(i18nUI, locale)}
  search={{ SearchDialog: Search }}
>
```

### 渲染管线

```text
next.config.ts (createMDX)
  → source.config.ts (defineDocs + remarkCodeTitle + transformerMetaTitle)
    → .source/ (fumadocs-mdx 编译产物)
      → src/lib/source.ts (loader + i18n parser:'dir' → Record<lang, pageTree>)
        → src/app/[lang]/docs/layout.tsx (DocsLayout, tree=pageTree[lang])
          → src/app/[lang]/docs/[...slug]/page.tsx (DocsPage + MDX + CustomCodeBlock + Guestbook)
```

## 可用命令

| 命令 | 说明 |
| :--- | :--- |
| `bun dev` | 启动开发服务器 (Turbopack) |
| `bun run build` | 生产构建 |
| `bun run start` | 启动生产服务器（需先构建） |
| `bun run typecheck` | TypeScript 类型检查 |
| `bun run lint` | Biome Lint |
| `bun run format` | Biome 格式化 |
| `bun run check` | Biome 格式化 + Lint + 自动修复 |

## 贡献指南

欢迎为项目做出贡献！详细的贡献指南请参阅 [CONTRIBUTING.MD](./CONTRIBUTING.MD)。

### 快速贡献

```bash
# 1. Fork 并克隆项目
git clone https://github.com/<your-username>/Neoverse-Doc.git

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

## License

[MIT](LICENSE) © 2026 [SSJ-ZYJ](https://github.com/SSJ-ZYJ) & [Collinor](https://github.com/Collinor)
