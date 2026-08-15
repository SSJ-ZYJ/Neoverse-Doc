# 架构依赖边界以自研轻量脚本强制执行

项目在 `src/` 下形成了九个架构层（app / features / runtime / adapters / ui / content / components / lib / dictionaries），此前仅靠 AGENTS.md 文本约定依赖方向，无自动保护。我们决定以 `scripts/check-architecture.ts`（`bun run check:architecture`，并前置进 `prebuild`）按层依赖矩阵扫描 import graph，而不是引入 dependency-cruiser 等新依赖。

## 考虑过的选项

- **dependency-cruiser**：工业级、规则表达力强，但需要新增 devDependency 与独立配置体系，而本仓库的跨层导入 100% 走 `@/` 别名、无跨层相对导入、动态导入仅指向 npm 包 —— 正则级扫描在此代码库可证明可靠，其 80% 能力（循环检测、依赖图可视化等）用不上。若未来层级或文件数量暴涨再迁移。
- **Biome**：无 per-folder 边界规则能力，排除。

## 决策要点

- **按现实编码九层，而非理想六层模型**。`components` 是站点文档明示的迁移过渡层（共享组件 + MDX 注册表），`lib` 是站点胶水，`dictionaries` 是字典叶子层 —— 规则矩阵与现实一一对齐才有防御力，最密集的深导入违规恰好位于 `components`。
- **lib 与 dictionaries 构成唯一有意双向对**：`dictionaries → lib/i18n`（locale 定义）与 `lib/seo.ts → dictionaries`（本地化元数据）。两者同属站点胶水簇，拆分收益为负。
- **adapters → lib 按纯公共能力原则放行**（i18n 配置），其余上层目标禁止；现存 4 处桥接例外集中在 `EXCEPTIONS` 清单，逐条附理由，检查输出可见，失效时告警提示清理。
- **桶规则**：跨边界消费 feature 必须经由其 `index.ts` 公共入口，禁止深导入内部文件；同 feature 内部不受限。runtime / adapters / content 的模块路径本身是稳定语义单元，暂不强制桶化。

## 后果

- 新增顶层目录必须在脚本 `ALLOWED` 矩阵登记，否则报"未知层"失败 —— 这是有意的：新边界应当是显式决策。
- 扩展新规则（如"content 不得导入 React"、循环检测）时，在同一脚本内追加检查函数即可；脚本刻意保持在正则级扫描，不引入 TypeScript Compiler 级自研分析器。
- 本轮修正的存量违规与全部例外清单见站点文档《项目结构与静态构建》架构检查一节。
