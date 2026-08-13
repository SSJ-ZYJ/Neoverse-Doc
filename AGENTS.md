# AGENTS.md

本文件约束 AI Agent 在 Neoverse-Docs 中的代码、文档、样式与配置修改行为。

目标：**以最小、准确、可维护的修改完成需求，同时保持项目现有架构、设计语言、性能与内容一致性。**

---

## 1. 基本原则

1. **最小改动**

   * 只修改完成当前需求所必需的内容。
   * 不得无故重构、移动文件、修改公共 API 或格式化无关代码。
   * 优先修复根因，不通过重复状态、额外定时器、高权重 CSS 或临时 Hack 掩盖问题。

2. **先检查，后实现**

   * 修改前先阅读相关代码、配置、样式、字典和文档。
   * 优先复用项目已有组件、工具函数、Token、配置和实现模式。
   * 涉及 Fumadocs、Next.js 等框架能力时，先查对应版本的官方文档，避免重复造轮子。

3. **以当前仓库为准**

   * 依赖和版本以 `package.json` 为准。
   * 功能行为以当前代码和配置为准。
   * 不根据旧版本、其他项目或记忆假设项目行为。

4. **必要时才确认**

   * 能从代码、配置或官方文档确定的问题应自行判断。
   * 只有当修改会明显影响架构、依赖、公共 API、数据结构、兼容性或用户数据，且存在显著不同方案时再向用户确认。

---

## 2. 架构约束

### Static-first

Neoverse-Docs 生产环境采用静态导出。

除非用户明确要求，不得：

* 破坏 `output: 'export'`；
* 引入必须长期运行的服务端；
* 引入数据库或账号系统；
* 让核心功能依赖 Server Action、Middleware 或请求时服务端计算；
* 将现有静态能力改为必须依赖在线后端。

阅读进度、任务状态、界面偏好等轻量状态优先使用浏览器本地能力。

### Server-first

React 组件默认优先保持 Server Component。

只有需要以下能力时才增加 `"use client"`：

* State / Effect；
* 浏览器 API；
* 用户交互；
* 客户端专用第三方库。

客户端边界应尽量小，不得为了方便将整个页面或大型组件树无意义客户端化。

### Fumadocs-first

Fumadocs 是项目的文档基础设施。

涉及 Page Tree、MDX、TOC、Search、i18n、Docs Layout、内容源时，优先使用现有 Fumadocs API 和官方能力。

不得长期依赖 Fumadocs 不稳定的内部 DOM 层级实现业务逻辑；确实需要识别元素时优先使用稳定的组件 API、`data-*` 或其他显式语义标记。

---

## 3. 依赖与代码

1. 禁止擅自新增、删除、升级、降级或替换依赖。
2. 如确需新增依赖，应先向用户说明：

   * 名称；
   * 用途；
   * 拟使用版本；
   * 现有方案为何不足。

3. 保持 TypeScript 类型安全，不使用 `any`、`@ts-ignore` 等方式掩盖真实问题，除非存在明确且已说明的特殊原因。
4. 新增核心逻辑、非直观实现或特殊兼容处理时补充必要注释。代码注释保持项目现有习惯：

```ts
// English description.
// 中文说明。
```

   不为显而易见的代码添加解释性噪声。

---

## 4. 界面文案与 i18n

所有新增或修改的**用户可见 UI 文本**必须接入项目现有 i18n 体系。

包括但不限于：

* Button；
* Tooltip；
* aria-label；
* 状态文本；
* 空状态；
* 错误提示；
* 页面 UI 文案。

新增字典字段时同步维护现有语言字典，并保持结构一致。

不得重复硬编码 locale、站点信息或已经存在集中配置的常量。

---

## 5. 内容与 MDX

### 内容多语言

站点内容遵循现有：

```text
content/docs/{locale}/
```

目录结构。

若某篇站点文档已经存在对应中英文版本，修改核心内容时应同步维护。

对于当前只有中文的页面，不得仅为形式上的“同步”擅自创建英文版本。

仓库级独立文档如 `README.md` 不受站点 locale 目录规则约束，遵循其现有命名方式。

### Frontmatter

Frontmatter 必须符合 `source.config.ts` 中定义的 Schema。

新增内容语义（如 Topic、内容类型、学习路径、难度、前置知识、相关推荐）时，应优先扩展统一 Content Schema，而不是从文件名、URL、标题或 DOM 中反向猜测。

不得在页面中使用未经 Schema 声明的自定义 Frontmatter 字段。

### 新增与修改文档

* 新增或移动页面后，同步在对应目录的 `meta.json` 中注册或调整条目。
* 新增站点 MDX 组件时，同步在 `src/components/mdx/mdx-preview-shims.tsx` 导出并在 `.mdx-previewrc.json` 注册，避免 VS Code MDX Preview 将其识别为未知组件。

### 文档格式

* 站点文档沿用现有 `.mdx` 体系。
* 页面已有 Frontmatter 标题时，正文默认从 `##` 开始。
* 代码块必须声明正确语言。
* 命令、路径、配置项、API、环境变量等技术标识按语境使用反引号。
* 中文与英文、数字、英文缩写之间原则上保留一个半角空格。
* 正文引号统一使用中文全角引号“”，不要与英文直引号 `"` 混用；代码、命令、配置文件或属性值等字符串中的引号保持英文原样。
* 首次出现的陌生术语（如 BOM）应在原文附近直接说明其含义；若详细解释安排在其他章节，应在首次出现处建立链接引导，避免读者无从查起。
* 站内文档互链使用 `/zh/docs/ch1/xxx` 形式；能定位到具体小节时尽量附加标题锚点（如 `#91-第一个脚本`）。锚点与标题一一对应：标点（`、` `：` `（）` 等）移除、空格改为 `-`、中英文原样保留，参考现有写法（`#113-路径绝对路径与相对路径`、`#六高效搜索`）。
* Mermaid 仅在图形表达明显优于纯文本时使用。
* 不为单纯视觉差异重复创建 MDX 组件；新组件应优先代表新的内容或教学语义。

文档中的命令、配置、路径、版本、前置条件和功能描述必须与当前项目或可靠官方资料一致，不得描述尚未实现的功能。

---

## 6. UI 与 Design System

Neoverse 已有自己的视觉体系。

新增或修改 UI 时：

1. 优先使用现有 Token、组件和样式模式。
2. 避免散落重复的颜色、圆角、阴影、动画时长等硬编码值。
3. 同时检查 Light / Dark。
4. 保持 Mobile 可用。
5. 不通过不断增加 `!important` 或选择器权重解决结构性样式问题。

### 视觉原则

```text
内容与可读性 > 装饰
信息层级 > 特效数量
语义一致性 > 局部炫技
精致收敛 > 新增第二套体系
```

Glass、Glow、粒子、Blur 和环境 Motion 应作为增强效果而不是默认组件样式（参考现有视觉原则和组件实现，避免叠加）。

新增视觉效果前优先考虑：

* 能否复用现有视觉语言；
* 能否替换旧效果而不是继续叠加；
* 是否影响阅读；
* 是否明显增加 GPU / JS 成本。

任何非必要 Motion 都应尊重 `prefers-reduced-motion`。

---

## 7. 性能与交互

Neoverse 是内容优先的文档站，视觉效果不得明显损害阅读性能。

谨慎增加：

* 大面积 `backdrop-filter` / Blur；
* 持续 Canvas 或粒子动画；
* 高频 DOM 查询；
* 高频 `pointermove` / `scroll` 逻辑；
* 长时间 RAF；
* 大型 Client Component。

不重复维护可以从 Props、Context、URL 或现有数据推导出的状态。

持续动画优先使用 `transform` 和 `opacity`。

Mermaid、Giscus 等非首屏重型能力继续遵循按需加载原则。

交互逻辑必须正确清理：

* Event Listener；
* Timer；
* RAF；
* Observer；
* 动态 DOM；
* 临时状态。

---

## 8. 修改后的检查与验证

完成修改后至少检查：

* 无用 Import；
* 死代码和调试代码；
* 重复逻辑；
* 用户可见文本硬编码；
* 不必要的 Client Component；
* Light / Dark 与 reduced-motion；
* Mobile 与整体布局；
* 受影响的调用方；
* 相关文档是否需要同步（见第 10 节）。

验证应根据修改范围执行，不机械运行全部命令。

常用命令：

| 命令 | 说明 |
| :--- | :--- |
| `bun dev` | 启动开发服务器（Turbopack），自动生成 Mermaid 资源 |
| `bun lint` | Biome Lint 检查 |
| `bun typecheck` | 类型检查（会先执行 `next typegen` 与 `fumadocs-mdx`，同时校验 MDX 与 frontmatter） |
| `bun run build` | 生产构建（`prebuild` 自动生成 Mermaid 静态资源，先确保内容可被 Fumadocs 解析） |
| `bun format` | Biome 格式化（`--write`） |
| `bun run start` | 本地预览 `out/` 静态产物 |

说明：

* 修改涉及 Mermaid 图表（新增、调整或数目变化）时，需要通过 `prebuild` 或 `bun run generate:mermaid` 重新生成对应静态资源，并验证产物正常。
* 修改 MDX 文档或其 Frontmatter 后，运行 `bun typecheck`（含 `fumadocs-mdx`）校验内容可以被正确解析。

注意：

```bash
bun check
```

当前会执行带 `--write` 的 Biome Check，**会修改工作区文件**。不得把它当作默认只读检查；执行后必须检查 Diff。

若用户明确限制测试范围，应严格执行限制。通常修改是否有效由用户进行测试验证，你只需要保证代码不包含任何警告与错误。

不得声称未实际执行的检查已经通过。

---

## 9. 终端编码

本项目命令行脚本、README 与文档含大量中文。在 Windows 机器（Windows PowerShell 5.1 等）中执行 `Select-String`、`rg`、`Get-Content` 等搜索/读取命令时，输出可能按本地代码页（GBK）解码 UTF-8 内容造成中文乱码。

处理方式：

1. 需要搜索或精确读取中文内容时，优先使用 Read / Grep / Glob 等直接工具，避免经过终端管道。
2. 不得已使用命令行时，先 `chcp 65001` 或 `[Console]::OutputEncoding = [Text.UTF8Encoding]::new()` 切换 UTF-8 后再执行。
3. 判断文件内容以工具返回为准，不要让乱码污染终端输出之后用于判断内容。

---

## 10. 文档同步

如果修改影响：

* 功能或行为；
* 配置；
* 命令；
* API；
* 目录结构；
* 用户使用方式；

应修复并同步更新 `README.md`、站点文档或其它相关文档。

不要为机械满足“同步”要求修改无关文档。

---

## 11. Git 安全

允许执行只读 Git 操作，例如：

```bash
git status
git diff
git log
git show
```

未经用户明确要求，不得执行：

```bash
git commit
git push
git reset --hard
git clean
git rebase
git merge
git restore .
git checkout -- .
```

不得覆盖或清除用户尚未提交的修改。

完成任务后，根据：

```text
.vscode/prompt/commit-instruction.md
```

提供建议的 Commit Message，但不得自行提交。

---

## 12. 最终汇报

完成任务后简要说明：

1. 完成的修改；
2. 关键实现方式；
3. 主要涉及文件；
4. 实际执行的验证及结果；
5. 未执行的必要验证或已知风险；
6. 建议的 Commit Message。

不要逐行复述代码，也不要虚构测试结果。

---

## 13. 决策优先级

发生冲突时按以下顺序处理：

1. 用户当前明确要求；
2. 安全与用户数据完整性；
3. 当前项目代码、配置及实际行为；
4. 本 `AGENTS.md`；
5. 当前版本框架与依赖的官方文档；
6. 通用工程实践。

任何情况下都不得为了机械满足规则而引入无关修改、破坏现有行为或虚构项目能力。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
