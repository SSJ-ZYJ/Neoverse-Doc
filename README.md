<div align="center">

# Neoverse-Docs

**一份面向计算机专业学生的文档**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![fumadocs](https://img.shields.io/badge/fumadocs-16.14-FF5C5C)](https://fumadocs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Bun](https://img.shields.io/badge/Bun-1.0-F9F1E0?logo=bun&logoColor=black)](https://bun.sh)

</div>

## 目录

- [项目简介](#项目简介)
- [技术栈](#技术栈)
- [读者功能](#读者功能)
- [快速开始](#快速开始)
- [可用命令](#可用命令)
- [贡献与反馈](#贡献与反馈)
- [License](#license)

## 项目简介

Neoverse-Docs 是一份持续更新的开源在线学习文档，面向计算机科班学生与开发者，定位为“缺失的一学期”——补齐那些课程里很少正式教、却在日常学习与开发中每天都在用的工具与习惯。

网站支持中文 / English 双语阅读，英文内容仍在建设中；具体章节与内容状态以站点实际内容为准。

## 技术栈

本项目是一套基于现代 Web 技术构建的静态文档站：

| 技术 | 用途 |
| :--- | :--- |
| Next.js 16 + React 19 | 应用框架与运行时，生产环境静态导出 |
| fumadocs | 文档引擎：页面树、MDX 编译、静态搜索与文档布局 |
| MDX（Markdown + JSX） | 文档内容格式，支持组件嵌入与交互语法 |
| Tailwind CSS v4 | 样式体系（组件 Token + 工具类） |
| Mermaid + KaTeX | 图表与数学公式渲染 |
| Giscus | 基于 GitHub Discussions 的文档评论区 |
| TypeScript + Biome | 类型安全与代码质量检查 |
| Bun | 包管理与开发 / 构建脚本 |

更多技术细节见站点「关于与共建」章节。

## 读者功能

- **全文搜索**：支持中文与英文关键词搜索，中文页面标题支持无声调全拼与拼音首字母；可将搜索范围限定到单个章节
- **主题与语言**：浅色 / 深色 / 跟随系统三种主题，一键切换中英文界面
- **代码块与图文**：代码块一键复制、多语言示例切换；提示块、折叠内容、Mermaid 交互图表与 LaTeX 公式
- **任务进度**：文档中的任务项可直接勾选，并在当前浏览器按页面保存进度；开启 `todoProgress` 的页面会展示进度概览
- **社区互动**：每页底部提供基于 GitHub Discussions 的评论区，也可通过 GitHub Issues 反馈问题

## 快速开始

### 前置要求

- **Node.js** >= 20
- **Bun** >= 1.0

### 安装与运行

```bash
git clone https://github.com/SSJ-ZYJ/Neoverse-Doc.git
cd Neoverse-Doc
bun install     # 安装依赖
bun dev         # 启动开发服务器，浏览器打开 http://localhost:3000
```

### 构建部署

```bash
bun run generate:mermaid # 在本机生成 Mermaid 静态 SVG
bun run build   # 生产构建，产物位于 out/ 目录
bun run start   # 本地预览静态产物
```

构建会优先复用已生成的 Mermaid 静态 SVG；如果托管环境无法启动 Chrome，缺失图表会回退到浏览器端渲染，不会阻塞静态导出。提交文档前仍应在本机运行 `bun run generate:mermaid` 并提交生成产物，以保持正常页面无需加载 Mermaid 布局引擎。构建产物为纯静态文件，可部署到任意静态托管平台。

## 可用命令

| 命令 | 说明 |
| :--- | :--- |
| `bun dev` | 启动开发服务器 |
| `bun run generate:mermaid` | 生成 Mermaid 静态 SVG 与资源清单 |
| `bun run build` | 生产构建（输出至 `out/`） |
| `bun run typecheck` | 类型检查（含 MDX 内容校验） |
| `bun run lint` | Biome Lint |
| `bun run format` | Biome 格式化 |
| `bun run check` | Biome 检查并自动修复 |

## 贡献与反馈

欢迎参与内容写作、翻译与改进：

- 写作规范、内容语法与提交流程见 [CONTRIBUTING.MD](CONTRIBUTING.MD)，或直接阅读站点「关于与共建」中的[贡献指南](content/docs/zh/about/guide.mdx)
- 问题与建议：请在仓库提交 [GitHub Issues](https://github.com/SSJ-ZYJ/Neoverse-Doc/issues)

## License

- **代码**：[MIT](LICENSE) © 2026 [Shenshijun](https://github.com/SSJ-ZYJ)
- **文档内容**：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
