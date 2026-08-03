<div align="center">

# Neoverse-Docs

**一份还在做的文档** · 基于 Next.js 16 + React 19 + fumadocs 构建的静态文档站

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![fumadocs](https://img.shields.io/badge/fumadocs-16.13-FF5C5C)](https://fumadocs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Biome](https://img.shields.io/badge/Biome-2.5-60A5FA?logo=biome&logoColor=white)](https://biomejs.dev)
[![Bun](https://img.shields.io/badge/Bun-1.0-F9F1E0?logo=bun&logoColor=black)](https://bun.sh)
[![Mermaid](https://img.shields.io/badge/Mermaid-11-FF3670?logo=mermaid&logoColor=white)](https://mermaid.js.org)

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
- **MDX 文档驱动** — Markdown + React 组件混合编写，支持 GFM 表格、任务列表、GitHub Alert 风格提示块、可折叠块、AI 摘要打字机、Mermaid 图表、LaTeX 公式等丰富语法；折叠块内的正文、有序列表标记与代码块保持统一内容边缘，DocCard 使用紧凑资源入口布局呈现目标类型与域名，优先解析目标官网声明的透明 SVG 图标、无矢量资源时使用官网 favicon，并让外部资源在新标签页安全打开，代码 Tabs 仅由外层提供圆角和整体粒子反馈，内部标签保持无框
- **增强代码块** — 自动识别顶部注释提取文件路径、顶部横条显示语言图标与复制按钮、Shiki 语法高亮、多语言 Tabs 联动
- **统一页面转场** — 集中式路由策略提供 `aperture` 径向揭示、内容切换、页面概览与语言交叉淡入；来源视觉仅保存在内存 DOM 克隆中
- **中英文混合搜索** — Orama 静态索引配合混合分词器，支持中文全文与英文大小写无关搜索，并可将结果限定到指定章节
- **双语 i18n (中文 / 英文)** — 零硬编码的字典式文案管理，覆盖 fumadocs 内置 UI 及项目自定义文案；导航栏右上角内置语言切换器
- **可交互文档任务清单** — 标准 Markdown / MDX `- [ ]` 与 `- [x]` 语法会渲染为可直接勾选的任务项，按文档页面在当前浏览器保存进度；勾选反馈使用轻量光子与扫光动画，并在移动端和减少动态效果模式下自动降级；在文章 frontmatter 中配置 `todoProgress: true` 后，正文顶部会使用项目卡片样式汇总已完成项与总数，并可通过 Fumadocs 生成的标题 Hash 平滑滚动到文末 TODO 清单对应的章节标题；首次深跳转会实体化当前文档的离屏延迟区块并保持到离开页面，避免估算高度恢复时再次改变落点
- **专业学习门户** — 首页章节入口来自 Fumadocs 页面树，以面向计算机相关专业的学习导航替代技术栈宣传，并使用 CSS 滚动驱动的知识图谱、神经网络与数据流背景；页脚以透明场景延续和自适应深浅主题的玻璃信息栏收束页面
- **沉浸式控件反馈** — 使用清晰可见的冰蓝 / 白色 HarmonyOS 风格圆点粒子；拖拽路径经帧级合并与距离插值连续补点，主页 CTA 使用紧凑出生圆环，侧栏底部共享工具栏仅以可见内缩玻璃条作为粒子边界，代码 Tabs 的语言栏与代码面板共享同一可见粒子层，移动端标题栏由圆角外层统一承载反馈，并在减少动态效果模式下关闭
- **语义化设计系统** — 石墨中性色、冰蓝与薄荷青组成独立调校的深浅主题，颜色、表面、圆角、阴影和动效均由 Token 驱动；卡片、TOC、悬浮栏和二级玻璃菜单使用统一表面圆角，按钮与头像使用统一紧凑圆角，hover 锐利描边始终复用宿主真实边缘；文档卡片在超宽屏空间充足时使用独立宽屏阅读 Token 适度加宽，并始终保持居中
- **Giscus 社区互动** — 基于 GitHub Discussions 的留言墙，每个文档页底均提供与正文卡片分离的独立 Grid 社区模块；社区卡片与正文共享边框、圆角、背景、阴影和主题降级规则，Giscus iframe 跟随页面自然高度，不引入嵌套滚动或固定视口空白；评论卡片、输入框、按钮与头像分别映射项目的 `--radius-md`、`--radius-sm`、`--radius-xs` 圆角层级，并提供随站点主题同步切换的浅色 / 深色玻璃样式；iframe 根画布与宿主色彩方案强制同步，避免系统主题造成黑底串色；深色评论框采用无定向渐变的石墨深海分层表面，表情弹层使用高模糊半透明折射玻璃，GitHub 登录按钮使用低亮玻璃配色，避免高亮渐变破坏暗色层级；宿主组件禁止误选，iframe 内链接、输入框与按钮仍保持完整交互
- **Mermaid 交互图表** — 内置宽度适配、默认居中、缩放、拖动、重置与视口内放大，并统一节点玻璃样式；普通与全屏工具栏共享独立于控件内容的玻璃模糊背景层，使用无变换居中避免阻断背景采样，以折射描边和主题阴影强化玻璃层次，并让全屏状态从首帧获得更轻透的玻璃底色
- **长文档渲染优化** — 代码块与普通折叠块优先服务端渲染；Mermaid 在接近视口时按需加载并合并工具栏滚动定位；高成本离屏内容块与首页区段使用浏览器原生 containment 延迟布局与绘制；嵌套玻璃表面仅由外层执行背景模糊，主题切换临时停用 CSS 过渡，持续扫光与网格动效使用 `transform` / `opacity` 合成；首页环境动效通过共享时钟保留原有轨迹、滤镜与缓动，并使用集中式帧率预算避免高刷屏重复提交，触摸粒子按帧批量写入 DOM
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
| 代码质量 | Biome 2.5 |
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
│   │       ├── layout.tsx         # RootProvider 注入 i18nProvider + TransitionProvider
│   │       ├── (home)/            # 主页路由组（独立布局）
│   │       │   ├── layout.tsx     # HomeLayout 包裹
│   │       │   ├── (index)/page.tsx # 首页（多区段内容门户）
│   │       │   ├── template.tsx   # 直达加载与 BFCache 安全外壳
│   │       │   └── guestbook/page.tsx # 独立留言墙页面
│   │       └── docs/              # 文档路由组
│   │           ├── layout.tsx     # DocsLayout（侧栏 + 正文 + 目录）
│   │           ├── template.tsx   # 文档模板（无动画，因 fumadocs CSS Grid 约束）
│   │           └── [...slug]/page.tsx # 文档正文（MDX + Mermaid + Giscus）
│   ├── components/
│   │   ├── home/                  # 首页业务组件（Hero / 章节 / AI 计算背景 / footer）
│   │   ├── react-bits/            # 本地化轻量效果（光束 / 拆字 / 磁吸 / Bento 等）
│   │   ├── transition/            # 集中式页面转场系统
│   │   │   ├── transition-provider.tsx # 转场状态、路由提交与清理
│   │   │   ├── transition-layer.tsx    # 单一不可交互 DOM 克隆层
│   │   │   ├── transition-link.tsx     # 统一内部链接 API
│   │   │   ├── transition-policy.ts    # 纯函数路由策略
│   │   │   └── transition-controller.ts # DOM 克隆、清理与几何计算
│   │   ├── mdx/                   # MDX 内容渲染组件
│   │   │   ├── custom-codeblock.tsx  # 增强代码块（文件路径 + 复制按钮）
│   │   │   ├── code-tabs.tsx         # 多语言 Tabs 联动组件
│   │   │   ├── collapsible-details.tsx # 可折叠块 + AI 打字机渲染
│   │   │   ├── mermaid.tsx           # Mermaid 图表渲染（缩放 / 拖动 / 最大化）
│   │   │   ├── task-list-item.tsx     # Markdown 任务项服务端识别
│   │   │   ├── interactive-task-list-item.tsx # 可勾选并持久化的任务项
│   │   │   ├── task-list-progress.tsx          # 页面级任务完成进度概览
│   │   │   ├── docs-author.tsx       # 文档作者与贡献者展示
│   │   │   ├── mdx-preview-shims.tsx # VS Code MDX Preview 自定义组件入口
│   │   │   └── doc-cards.tsx         # DocCard / DocGrid / LearningPath 等
│   │   ├── docs-community.tsx     # 与正文隔离的文档社区模块
│   │   ├── guestbook.tsx          # Giscus 评论组件（按 locale 切换语言）
│   │   ├── immersive-interaction-controller.tsx # 点击 / 拖拽粒子预算、节流与清理
│   │   ├── nav-title.tsx         # 导航栏品牌标题（纯展示组件）
│   │   ├── search.tsx             # 静态搜索对话框（Orama + Mandarin 分词）
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
│   │   ├── motion-config.ts       # JavaScript 动效时长、缓动、帧率预算与 reduced-motion 检测
│   │   ├── home-sections.ts       # 从 Fumadocs 页面树提取首页章节
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
│       ├── theme.css              # Tailwind / Fumadocs 基础主题
│       ├── tokens.css             # 语义颜色、圆角、阴影、间距与动效 Token
│       ├── motion.css             # 统一入场与 reduced-motion 规则
│       ├── immersive-interactions.css # 控件光感、粒子与静态降级
│       ├── glass.css              # 液态玻璃设计系统（工具类 + 环境光）
│       ├── fumadocs-glass.css     # Fumadocs 表面玻璃化覆盖
│       ├── giscus.css             # Giscus 宿主无框布局与加载占位
│       ├── typography.css         # 代码块、引用块、提示框、行内代码
│       ├── pages/                 # 首页、文档页与特殊页面样式
│       ├── transitions.css        # 页面转场层与目标入场动画
│       ├── mermaid.css            # Mermaid 图表样式
│       ├── loading.css            # 路由加载样式
│       └── a11y.css               # 无障碍（减少动画 / 减少透明度 / 回退）
├── public/
│   ├── giscus-light.css           # Giscus iframe 浅色主题
│   └── giscus-dark.css            # Giscus iframe 深色主题
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

页面转场由单一 `TransitionProvider` 管理。`transition-policy.ts` 以纯函数分类来源与目标路由，`TransitionLink` 只声明语义，不在业务组件中重复判断路由、快照或点击坐标；Provider 会在目标模板挂载前写入临时导航标记，避免留言板返回主页等客户端导航与直达加载淡入重复播放。

`aperture` 会在内存中克隆实际 DOM，移除重复 `id` 与 `canvas`、`video`、`iframe`、`script` 等节点，并禁用克隆交互。目标路由提交前保持来源视觉，提交后从点击位置向四角最大距离扩展径向揭示；完成或超时后立即销毁克隆，不再将完整页面 HTML 写入 `sessionStorage`。

| 方向 | 动画 | 实现 |
| :--- | :--- | :--- |
| home / guestbook → docs | `aperture` | 点击位置径向揭示，约 1200ms |
| docs → home / guestbook | `overview` | 短淡入与轻微上移，约 560ms |
| home ↔ guestbook | `surface` | 留言板淡入；返回主页时仅主视觉轻量收束，避免整页重绘，约 480ms |
| docs → docs | `content` | 仅正文区域短入场，约 360ms |
| 语言切换 | `crossfade` | 对应页面交叉淡入，约 420ms |
| 同页 Hash | 无 | 保留原生锚点行为 |

关键文件：

- [src/components/transition/transition-provider.tsx](src/components/transition/transition-provider.tsx) — 集中式状态、路由提交与异常清理
- [src/components/transition/transition-policy.ts](src/components/transition/transition-policy.ts) — 路由到转场语义的纯函数映射
- [src/components/transition/transition-controller.ts](src/components/transition/transition-controller.ts) — DOM 克隆、无障碍清理与半径计算
- [src/styles/transitions.css](src/styles/transitions.css) — 单一转场层与 reduced-motion 降级

### 跨文档阅读返回

正文中的站内文档链接会记录当前文章、地址、点击链接在正文中的元素路径及其视口位置。到达另一篇文档后，页面底部会显示紧凑的“返回阅读位置”悬浮按钮；点击后使用浏览器历史返回来源文章，在首次显示前重新找到同一链接并恢复到离开时的屏幕高度。绝对滚动位置仅作为元素路径失效时的兜底，从而避免上方内容重新布局造成偏移。

该能力仅处理正文内普通的同源文档跳转；外部链接、新窗口链接、下载链接、同页 Hash 及 Fumadocs 的上一篇/下一篇导航保持原有行为。返回点仅以经过校验的来源、目标与滚动位置元数据暂存于 `sessionStorage`，不会保存或复制正文内容。

关键文件：[src/components/docs-reading-return.tsx](src/components/docs-reading-return.tsx)。

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

- 缩放（全屏渲染视图下以鼠标位置为锚点滚轮缩放 + 工具栏按钮）
- 拖动平移
- 重置缩放
- 视口内最大化（Portal 弹层）
- 深色模式自动切换

工具栏文案从共享字典读取，无障碍标签齐全；模糊背景与控件内容使用独立合成层，在普通与全屏模式下稳定采样图表内容，并继续响应系统的减少透明度偏好。工具栏按“视图 / 缩放 / 画布操作”组成三个共享底板的紧凑分段，统一使用项目小圆角和按压尺度，整条工具栏仅保留最外层发丝描边；按钮使用独立的悬浮、激活与激活悬浮 Token，悬浮与激活底色均保持透明以透出后方图表或代码，同时在深浅玻璃表面上提供逐级加深的清晰反馈。图表渲染会先等待项目字体就绪，影响文字度量的样式通过 Mermaid `themeCSS` 在测量阶段生效，生成后的 `foreignObject` 保持溢出可见；Git Graph 分支文字还会依据实际字形与背景边界重新居中，避免文字偏移或分组标题被裁剪。渲染结果保留各 Mermaid 图型原生 `viewBox` 并仅在绘制内容越界时扩展边界，避免 `gitGraph` 等专用布局被通用测量覆盖；Git Graph 的八个分支槽、普通 / 高亮 / 反向 / 合并提交及标签使用项目语义色和主题表面，避免深色主题把分支和文字统一提亮为白色。小图保持自然内容尺寸，超出正文宽度或浏览器视口高度的大图自动按更严格的宽高约束等比缩小并完整显示。自动适配比例与用户交互缩放相互独立，因此工具栏初始及重置比例始终显示 `100%`，后续缩放也只变换画布内部 SVG。滚轮缩放仅在全屏渲染视图启用，通过同步补偿平移量把缩放中心锁定在鼠标位置；页面内图表与全屏代码视图继续使用原生滚动。代码视图复用渲染画布的可用宽度，短源码按自然高度展示，长源码以对应图表的实际显示高度为滚动上限；全屏模式不再额外限制源码宽度。节点、状态起止点、分组、连线与无底色转移标签复用项目玻璃和主题 Token。全局点击 / 拖拽粒子使用宿主直属裁剪层并同步控件圆角，首批粒子直接以小型环带展开，拖拽路径按距离插值连续生成圆点粒子；Mermaid 最大化画布与粒子宿主隔离。

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
- **章节范围**：索引使用页面首级 slug 作为 Fumadocs `tag`；弹窗使用适配深浅主题的可滚动玻璃下拉菜单，并从对应语言的页面树生成选项，可在全部章节或单个章节之间切换

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
├── theme.css              # Tailwind / Fumadocs 基础主题与兼容变量
├── tokens.css             # 语义颜色、圆角、阴影、间距与动效 Token
├── motion.css             # 统一入场与 reduced-motion 规则
├── glass.css              # 玻璃基础、业务表面与控件的统一实现
├── fumadocs-glass.css     # 组件覆写：fumadocs-ui CSS 预设 + CSS 变量映射
├── typography.css         # 排版：代码块、引用块、提示框、行内代码
├── pages/                 # 首页、文档页与特殊页面样式
├── transitions.css        # 集中式页面转场层
├── mermaid.css            # Mermaid：图表样式
├── loading.css            # 路由加载样式
└── a11y.css               # 无障碍：减少动画 / 减少透明度 / 回退
```

通过 Tailwind v4 的 `@theme inline` 将 CSS 变量映射为 Tailwind token，在 JSX 中可直接使用 `bg-background`、`text-foreground` 等语义化工具类。`next-themes` 通过 `class` 属性驱动 CSS 变量切换，实现浅色 / 深色模式全自动适配；切换期间会临时停用 CSS 过渡，避免长文章中的代码块与高亮节点同时执行主题动画。

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

- **代码**：[MIT](LICENSE) © 2026 [Shenshijun](https://github.com/SSJ-ZYJ)
- **文档内容**：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
