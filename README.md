# Neoverse-Doc

基于 **Next.js 16** + **React 19** + **fumadocs** 构建的静态文档站点

## 功能亮点

- **纯静态生成 (SSG)** — `next build` 直接生成完整 HTML，无需 Node 运行时，可部署至 Vercel、Cloudflare Pages、GitHub Pages 等任意静态托管平台
- **MDX 文档驱动** — Markdown + React 组件混合编写，支持 GFM 表格、任务列表、Mermaid 图表等丰富语法
- **双语 i18n (中文 / 英文)** — 零硬编码的字典式文案管理，覆盖 fumadocs 内置 UI 及项目自定义文案；导航栏右上角内置语言切换器，按 `[lang]` 路由切换界面与文档
- **Giscus 社区互动** — 基于 GitHub Discussions 的留言墙，每个文档页底均内嵌评论区
- **实用工具链** — TypeScript 严格模式、Biome 格式化与 Lint、Tailwind CSS v4

## 技术栈

| 类别 | 方案 |
| :--- | :--- |
| 框架 | Next.js 16 (Turbopack + App Router) |
| 运行时 | React 19 |
| 文档引擎 | fumadocs-core + fumadocs-ui + fumadocs-mdx |
| 样式 | Tailwind CSS v4 + CSS 变量 + 液态玻璃工具类 |
| 类型检查 | TypeScript 5 (strict) |
| 代码质量 | Biome 2.4 |
| 动效 | framer-motion |
| 评论 | Giscus (GitHub Discussions) |
| 主题切换 | next-themes |
| 图标 | lucide-react |
| Markdown | remark-github-blockquote-alert (GitHub Alert) |
| 图表 | Mermaid 11 + fumadocs remarkMdxMermaid 插件 |

## 项目结构

```text
Neoverse-Doc/
├── content/docs/                  # 文档内容（MDX），按语言子目录组织
│   ├── zh/                        # 中文文档子树
│   │   ├── getting-started/       # 入门指南
│   │   │   ├── index.md
│   │   │   ├── syntax-example.md  # Markdown 语法示例
│   │   │   └── meta.json          # 章节元信息（标题、页面顺序）
│   │   └── advanced/              # 进阶机制
│   │       ├── index.md
│   │       ├── i18n.md            # 国际化方案
│   │       ├── theming.md         # 液态玻璃主题
│   │       ├── search.md          # 搜索与索引
│   │       └── meta.json
│   └── en/                        # English document subtree（结构同 zh/）
│       ├── getting-started/
│       └── advanced/
├── src/
│   ├── app/                       # Next.js App Router 页面
│   │   ├── layout.tsx             # 根布局（<html>/<body> + 全局字体 + ThemeProvider）
│   │   ├── page.tsx               # 根路径客户端重定向到 /{defaultLocale}
│   │   ├── globals.css            # 主题变量层 / 液态玻璃工具类 / fumadocs 预设
│   │   ├── api/
│   │   │   └── search/
│   │   │       └── route.ts       # 静态搜索 API 路由
│   │   └── [lang]/                # 语言段（zh / en）
│   │       ├── layout.tsx         # 注入字典 + 按 locale 生成 metadata
│   │       ├── template.tsx       # 页面过渡动效模板（framer-motion）
│   │       ├── page.tsx           # 首页（品牌入口 + 进入文档按钮）
│   │       ├── docs/
│   │       │   ├── layout.tsx     # 文档布局（侧栏 + 正文 + 目录）
│   │       │   └── [...slug]/
│   │       │       └── page.tsx   # 文档正文（MDX + Mermaid + Giscus 评论区）
│   │       └── guestbook/
│   │           └── page.tsx       # 独立留言墙页面
│   ├── components/
│   │   ├── guestbook.tsx          # Giscus 评论组件（按 locale 切换语言）
│   │   └── mermaid.tsx            # Mermaid 图表渲染组件
│   ├── dictionaries/
│   │   ├── index.ts               # 字典聚合 + getDictionary(locale)
│   │   ├── zh.ts                  # 中文语言包
│   │   └── en.ts                  # 英文语言包
│   └── lib/
│       ├── i18n.ts                # 集中式 i18n 配置（defineI18n）
│       ├── layout.shared.tsx      # fumadocs UI 翻译 + baseOptions(locale)
│       └── source.ts              # fumadocs 内容源加载器（含 i18n parser: 'dir'）
├── source.config.ts               # fumadocs-mdx 配置（文档目录定义）
├── next.config.ts                 # Next.js 配置（静态导出 + MDX 插件）
├── biome.json                     # Biome 格式化与 Lint 规则
├── tsconfig.json                  # TypeScript 配置
├── postcss.config.mjs             # PostCSS / Tailwind CSS 配置
└── prompt/
    └── commit-instruction.md      # Commit 规范指引
```

## 核心架构

### 文档内容层

所有文档以 MDX 格式存放在 `content/docs/` 下，按章节分目录。每个目录内的 `meta.json` 定义章节标题和页面渲染顺序。`fumadocs-mdx` 在 `postinstall` / `build` 时自动将这些文件编译为类型安全的代码生成产物，存放在 `.source/` 目录中。

```text
content/docs/
  getting-started/
    meta.json      →  { "title": "入门指南", "pages": ["index", "syntax-example"] }
    index.md       →  自动生成类型与元信息
```

### 内容源加载

[src/lib/source.ts](./src/lib/source.ts) 通过 fumadocs-core 的 `loader` 将编译产物转为运行时页面树，驱动侧栏导航、面包屑和目录生成。

### 主题体系

[src/app/globals.css](./src/app/globals.css) 采用「变量层 → 工具类 → 组件覆写」三段式架构：

```text
变量层: CSS 自定义属性（--background / --glass-bg / --color-fd-* 等）
  ↓
工具类: .liquid-glass（全局可复用的毛玻璃效果）
  ↓
组件覆写: fumadocs-ui CSS 预设 + CSS 变量映射
```

通过 Tailwind v4 的 `@theme inline` 将 CSS 变量映射为 Tailwind token，在 JSX 中可直接使用 `bg-background`、`text-foreground` 等语义化工具类。`next-themes` 通过 `data-theme` 属性驱动 CSS 变量切换，实现浅色 / 深色模式全自动适配。

### i18n 体系

UI 文案分为两层管理：

- **fumadocs UI 翻译**：由 [src/lib/layout.shared.tsx](./src/lib/layout.shared.tsx) 中的 `defineI18nUI` 管理，覆盖搜索、主题切换、导航等 fumadocs 内置文案
- **页面自定义文案**：由 [src/dictionaries/](./src/dictionaries/index.ts) 管理，承载首页 tagline、导航名、卡片标题等业务文案

[src/lib/i18n.ts](./src/lib/i18n.ts) 通过 `defineI18n` 集中声明语言列表与默认语言，作为 i18n 配置的唯一来源（single source of truth），被 `source.ts` 的 loader 和 `layout.shared.tsx` 的 `defineI18nUI` 共同消费。

[src/app/[lang]/layout.tsx](./src/app/[lang]/layout.tsx) 通过 `RootProvider` 的 `i18n` 属性按路由注入对应翻译，文档内容通过 `source.getPage(slug, locale)`、侧栏树通过 `source.pageTree[locale]` 按语言取。loader 在 [src/lib/source.ts](./src/lib/source.ts) 中以 `parser: 'dir'` 模式按 `content/docs/{lang}/...` 子目录划分内容。

导航栏右上角的语言切换器由 fumadocs-ui 在检测到 loader 含 i18n 配置后自动渲染，无需额外接入。静态导出（`output: 'export'`）下不支持 middleware，根路径 `/` 由 [src/app/page.tsx](./src/app/page.tsx) 通过客户端跳转引导到 `/{defaultLocale}`。

新增语言的完整步骤详见进阶文档「[i18n 国际化](./content/docs/zh/advanced/i18n.md)」。

### 渲染管线

```text
next.config.ts (createMDX)
  → source.config.ts (defineDocs: content/docs)
    → .source/ (fumadocs-mdx 编译产物)
      → src/lib/source.ts (loader + i18n parser:'dir' → Record<lang, pageTree>)
        → src/app/[lang]/docs/layout.tsx (DocsLayout, tree=pageTree[lang])
          → src/app/[lang]/docs/[...slug]/page.tsx (DocsPage + MDX + Guestbook)
```

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

## License

[MIT](LICENSE) © 2026 [SSJ-ZYJ](https://github.com/SSJ-ZYJ) & [Collinor](https://github.com/Collinor)
