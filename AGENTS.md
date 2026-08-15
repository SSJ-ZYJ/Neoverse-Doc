# AGENTS.md

本文件约束 AI Agent 在 Neoverse-Docs 中的代码、文档、样式与配置修改行为。

目标：**以最小、准确、可维护的修改完成需求，同时保持项目现有架构、设计语言、性能与内容一致性。**

详细实现原则见文末「项目文档索引」，本文件只保留长期架构事实与高频约束。

---

## 1. 核心原则

1. **最小改动**：只修改完成当前需求所必需的内容；不得无故重构、移动文件、修改公共 API 或格式化无关代码。优先修复根因，不通过重复状态、额外定时器、高权重 CSS 或临时 Hack 掩盖问题。
2. **先检查，后实现**：修改前先阅读相关代码、配置、样式、字典和文档；优先复用项目已有组件、工具函数、Token 与实现模式。涉及 Fumadocs、Next.js 等框架能力时，先查对应版本官方文档。
3. **以当前仓库为准**：依赖与版本以 `package.json` 为准，行为以当前代码和配置为准，不根据旧版本、其他项目或记忆假设项目行为。
4. **必要时才确认**：能从代码、配置或官方文档确定的问题自行判断；只有当修改会明显影响架构、依赖、公共 API、数据结构、兼容性或用户数据，且存在显著不同方案时再向用户确认。
5. **决策优先级**：用户当前明确要求 > 安全与用户数据完整性 > 当前项目代码、配置及实际行为 > 本文件 > 当前版本框架与依赖的官方文档 > 通用工程实践。

---

## 2. 架构约束

### Static-first

生产环境为静态导出（`output: 'export'`）。除非用户明确要求，不得：

* 破坏静态导出；
* 引入必须长期运行的服务端、数据库或账号系统；
* 让核心功能依赖 Server Action、Middleware 或请求时服务端计算；
* 将现有静态能力改为依赖在线后端。

阅读进度、任务状态、界面偏好等轻量状态优先使用浏览器本地能力。

### Server-first

React 组件默认保持 Server Component，仅在需要 State / Effect、浏览器 API、用户交互或客户端专用第三方库时才增加 `"use client"`。客户端边界尽量小，不得无意义地将整个页面或大型组件树客户端化。

### Fumadocs-first

涉及 Page Tree、MDX、TOC、Search、i18n、Docs Layout、内容源时，优先使用 Fumadocs 现有 API 与官方能力。不得长期依赖 Fumadocs 不稳定的内部 DOM 层级实现业务逻辑；识别元素时使用稳定组件 API、`data-*` 或其他显式语义标记。

### 架构分层与依赖边界

`src/` 按 app / features / runtime / content / ui / adapters 等层组织，跨层依赖由 `scripts/check-architecture.ts` 自动检查（`bun run check:architecture`，前置进 `prebuild`）。**修改涉及跨层依赖时必须遵守 Architecture Boundary Check**，不得为绕过检查而引入例外；完整依赖矩阵与例外清单见 `docs/adr/0001-architecture-boundary-check.md`。

---

## 3. 内容与 i18n

### 界面文案

所有新增或修改的用户可见 UI 文本（Button、Tooltip、aria-label、状态文本、空状态、错误提示、页面文案等）必须接入现有 i18n 体系（`src/dictionaries/`）。新增字典字段时同步维护所有语言并保持结构一致。不得重复硬编码 locale、站点信息或已集中配置的常量。

### 内容多语言

站点内容遵循 `content/docs/{locale}/` 目录结构。已存在对应中英文版本的文档，修改核心内容时应同步维护；仅中文的页面不得仅为形式同步擅自创建英文版本。仓库级文档（如 `README.md`）不受此规则约束。

### Frontmatter 与 Content Schema

Frontmatter 必须符合 `src/content/schema/docs.ts`（`source.config.ts` 引用）定义的 Schema，不得使用未经 Schema 声明的自定义字段。新增内容语义（Topic、类型、学习路径、难度、前置知识、相关推荐）应扩展统一 Content Schema（见 `docs/adr/0002-content-schema-v2.md`），不从文件名、URL、标题或 DOM 反向猜测。

### 新增与修改文档

* 新增或移动页面后，同步在对应目录的 `meta.json` 注册或调整条目。
* 新增站点 MDX 组件时，同步在 `src/components/mdx/mdx-preview-shims.tsx` 导出并在 `.mdx-previewrc.json` 注册，避免 VS Code MDX Preview 将其识别为未知组件。
* 页面已有 Frontmatter 标题时，正文默认从 `##` 开始；代码块必须声明正确语言。
* 命令、路径、配置项、API、环境变量等技术标识按语境使用反引号；中英文、数字、英文缩写之间原则上保留一个半角空格。
* 正文引号统一使用中文全角引号“”，不混用英文直引号；代码、命令、配置或属性值中的引号保持英文原样。
* 站内互链使用 `/zh/docs/ch1/xxx` 形式，能定位到小节时附加标题锚点；锚点与标题一一对应（标点移除、空格改为 `-`）。
* 首次出现的陌生术语在原文附近直接说明含义，或链接到详细章节。
* 文档中的命令、配置、路径、版本、前置条件和功能描述必须与当前项目或可靠官方资料一致，不得描述尚未实现的功能。

---

## 4. UI 与交互

Neoverse 已有自己的视觉体系，新增或修改 UI 时：

1. 优先使用现有 Token、组件和样式模式，避免散落重复的颜色、圆角、阴影、动画时长等硬编码值。
2. 同时检查 Light / Dark 与 Mobile；不通过不断增加 `!important` 或选择器权重解决结构性样式问题。
3. 视觉原则：内容与可读性 > 装饰；信息层级 > 特效数量；语义一致性 > 局部炫技；精致收敛 > 新增第二套体系。
4. Glass、Glow、粒子、Blur 与环境 Motion 是增强效果而非默认样式；新增视觉效果前优先考虑复用或替换现有效果、是否影响阅读、是否明显增加 GPU / JS 成本。
5. 非必要 Motion 尊重 `prefers-reduced-motion`；持续动画优先使用 `transform` 和 `opacity`；交互逻辑（Event Listener、Timer、RAF、Observer、动态 DOM、临时状态）必须正确清理。

Design System、Motion 分级、转场、首页、搜索、Mermaid 的详细实现原则见「项目文档索引」，不在本文件重复。

---

## 5. 依赖与代码

1. 禁止擅自新增、删除、升级、降级或替换依赖。确需新增时，先向用户说明名称、用途、拟用版本及现有方案为何不足。
2. 保持 TypeScript 类型安全，不使用 `any`、`@ts-ignore` 掩盖真实问题，除非存在明确且已说明的特殊原因。
3. 新增核心逻辑、非直观实现或特殊兼容处理时补充必要注释，保持项目现有注释习惯（英文描述 + 中文说明），不为显而易见的代码添加解释性噪声。

---

## 6. 验证

完成修改后至少检查：无用 Import、死代码和调试代码、重复逻辑、用户可见文本硬编码、不必要的 Client Component、Light / Dark 与 reduced-motion、Mobile 与整体布局、受影响的调用方、相关文档是否需要同步。验证应根据修改范围执行，不机械运行全部命令。

常用命令（以 `package.json` 为准）：

| 命令 | 说明 |
| :--- | :--- |
| `bun dev` | 启动开发服务器 |
| `bun lint` | Biome Lint 检查 |
| `bun typecheck` | 类型检查（先执行 `next typegen` 与 `fumadocs-mdx`，同时校验 MDX 与 Frontmatter） |
| `bun run build` | 生产构建（`prebuild` 自动执行架构边界检查、内容检查并生成 Mermaid 资源） |
| `bun format` | Biome 格式化（`--write`） |
| `bun run start` | 本地预览 `out/` 静态产物 |

说明：

* 修改涉及 Mermaid 图表（新增、调整或数目变化）时，通过 `bun run generate:mermaid` 或 `prebuild` 重新生成静态资源并验证产物正常。
* 修改 MDX 文档或 Frontmatter 后，运行 `bun typecheck` 校验内容可被正确解析。
* `bun check` 执行带 `--write` 的 Biome Check，**会修改工作区文件**；不得当作只读检查，执行后必须检查 Diff。
* 若用户明确限制测试范围，应严格执行；不得声称未实际执行的检查已经通过。

### 终端编码（Windows）

项目命令行脚本、README 与文档含大量中文。在 Windows（PowerShell 5.1 等）中执行 `Select-String`、`rg`、`Get-Content` 等命令时，输出可能按本地代码页（GBK）解码 UTF-8 内容造成中文乱码。处理方式：

1. 需要搜索或精确读取中文内容时，优先使用 Read / Grep / Glob 等直接工具，避免经过终端管道。
2. 不得已使用命令行时，先 `chcp 65001` 或 `[Console]::OutputEncoding = [Text.UTF8Encoding]::new()` 切换 UTF-8。
3. 判断文件内容以工具返回为准，不让乱码污染后的终端输出参与判断。

---

## 7. Git 安全

允许只读 Git 操作（`git status`、`git diff`、`git log`、`git show`）。

未经用户明确要求，不得执行 `git commit`、`git push`、`git reset --hard`、`git clean`、`git rebase`、`git merge`、`git restore .`、`git checkout -- .`，不得覆盖或清除用户尚未提交的修改。

完成任务后，根据 `.vscode/prompt/commit-instruction.md` 提供建议的 Commit Message，但不得自行提交。

---

## 8. 任务收尾

如果修改影响功能或行为、配置、命令、API、目录结构或用户使用方式，应同步更新 `README.md`、站点文档或其它相关文档；不为机械满足“同步”要求修改无关文档。

完成任务后简要说明：

1. 完成的修改；
2. 关键实现方式；
3. 主要涉及文件；
4. 实际执行的验证及结果；
5. 未执行的必要验证或已知风险；
6. 建议的 Commit Message。

不要逐行复述代码，也不要虚构测试结果。

---

## 9. 项目文档索引

以下文档维护详细实现原则与决策记录，按需阅读，不在本文件重复解释：

| 场景 | 阅读文档 |
| :--- | :--- |
| 架构分层、依赖矩阵、路由与静态构建 | `content/docs/zh/about/project/architecture.mdx` |
| 内容 Schema、MDX 插件链、组件注册 | `content/docs/zh/about/project/content-engineering.mdx` |
| Token、主题、Motion 分级、无障碍降级 | `content/docs/zh/about/project/design-system.mdx` |
| 首页结构与沉浸式交互 | `content/docs/zh/about/project/home-and-immersive.mdx` |
| 搜索、导航、社区与 i18n 边界 | `content/docs/zh/about/project/search-navigation.mdx` |
| 路由转场系统 | `content/docs/zh/about/project/transitions.mdx` |
| Mermaid 构建期渲染与性能 | `content/docs/zh/about/project/mermaid-performance.mdx` |
| 架构边界检查决策记录 | `docs/adr/0001-architecture-boundary-check.md` |
| Content Schema v2 决策记录 | `docs/adr/0002-content-schema-v2.md` |
| 贡献流程、命名规范、PR 与翻译 | `content/docs/zh/about/contributing/index.mdx` |
| Commit Message 格式 | `.vscode/prompt/commit-instruction.md` |
