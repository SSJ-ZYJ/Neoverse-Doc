# GitHub Actions Quality Gate

Status: accepted

仓库已将本地约束固化为可执行检查：架构边界（ADR 0001、0005、0006）、内容校验与 Mermaid 产物对账（ADR 0002、0003、0004、0007）、Lint 与类型检查。但此前这些检查只在本地与 `prebuild` 中执行，没有 Pull Request 级自动门禁，明显错误仍可能合入 main。我们决定以最小、可靠的 GitHub Actions 工作流把这些约束升级为 PR 合并门禁，并在 main 上保留一次完整生产构建作为最终防线。

## 决策

- **拆分为两个 Workflow**：`.github/workflows/quality.yml` 针对每个 Pull Request 执行快速质量检查；`.github/workflows/build.yml` 针对 main push（及手动触发）执行完整生产构建。
- **Quality 覆盖**：Lint（`bun run lint`）、Typecheck（`bun run typecheck`）、Architecture Check（`bun run check:architecture`）、Content Check（`bun run check:content`，已含 Taxonomy、Content Graph、Prerequisite 环、Relation 引用校验与 Mermaid 资产哈希对账）与 Tests（`bun run test`，新增脚本，等价 `bun test`）。不重复执行 `check:content` 已覆盖的子检查，也不在 CI 中运行会改写工作区文件的 `bun check`（Biome `--write`）。
- **避免重复执行**：`prebuild` 已串起 `check:architecture && check:content`，因此 Production Build 只运行 `bun run build`，其内部 prebuild 的架构与内容检查即为最终门禁，CI 不再单独重复运行；快速检查由 PR 门禁保证，main 上不重复执行。
- **Mermaid 只校验不生成**：CI 与生产构建只通过 `check:content` 的 verify 分支做资产哈希对账，从不启动 Puppeteer；资产生成仅发生在本地 `bun run generate:content`（Content Prepare 阶段），产物随内容提交。CI 安装依赖时以 `PUPPETEER_SKIP_DOWNLOAD` 避免无谓下载 Chromium。
- **缓存**：使用 GitHub 官方 `actions/cache` 缓存 Bun 安装缓存（`~/.bun/install/cache`，key 绑定 `bun.lock`）+ `bun install --frozen-lockfile`，不做自定义缓存系统。
- **不做过度 CI**：不建多 OS / 多 Node Version Matrix；Node 固定 24.11.0（与 `edgeone.json` 部署对齐）、单 `ubuntu-latest`；不做 Preview Deployment、自动 Release、自动依赖升级、Benchmark 与 Visual Regression。

## Considered Options

- **单 Workflow 内按分支条件拆分 job**：文件更少，但 PR 与 main 的检查目标不同，合并到一个文件会混淆触发条件与 job 归属，也不便于分支保护分别设置 Required Check。
- **PR 上也运行完整 Static Build**：能更早暴露构建问题，但 `prebuild` 与 Quality 检查会重复执行架构与内容校验，且每次 PR 都承担构建成本；生产构建在 main 上执行已能拦截进入 main 的错误，收益与成本不匹配。
- **CI 中运行 Mermaid Generate**：能保证资产总是最新，但会让每个 PR 都启动 Puppeteer / Chromium，违背 ADR 0004 的「重型渲染只发生在内容准备阶段」设计，也放慢 CI。

## Consequences

- PR 上五个独立 job（Lint、Typecheck、Architecture、Content、Test）可分别在分支保护中设为 Required Check，阻止明显错误进入 main。
- 生产构建只在 main push（或手动触发）执行一次，内部经 prebuild 的架构与内容校验 + `next build` + `postbuild` 产物完整性验证。
- 新增 `test` 脚本（`bun test`），作为测试入口与 CI 命令读取 `package.json` 的原则保持一致。
- Mermaid 资产缺失或过期会在 PR 的 Content Check 直接失败，并提示运行 `bun run generate:content`。
- 工作流本身不复制 ADR 内容，只引用本决策编号与相关 ADR；分支保护需在 GitHub 仓库设置页配置（仓库代码无法代劳）。
