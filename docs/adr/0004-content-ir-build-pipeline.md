# Content IR 与构建管线：单一规范化数据面，生产构建零 Puppeteer

Status: accepted

Manifest、Search、Mermaid、Content Validation 各自消费文档数据，其中 Mermaid 脚本用私有文本扫描器独立遍历 `content/docs`，是 Fumadocs 之外的第二套内容理解；生产 `prebuild` 在资产缺失时会启动 Puppeteer。决策：引入 **Content IR**（`src/content/ir.ts`）作为唯一规范化数据面——从 Fumadocs source 单遍派生（含 Mermaid 图表源码提取），Manifest 与内容校验改为 IR 的消费方；构建命令收敛为 `generate:content`（准备阶段：IR → 校验 → 增量渲染，仅此时可启动 Puppeteer）与 `check:content`（生产门禁：IR → 校验 → 资产哈希对账，绝不导入 Puppeteer）。

## 考虑过的选项

- **IR 物化为 JSON 文件**：Next 静态导出反正要在 build 进程内加载 source 渲染页面，物化无性能收益，却引入"改了 MDX 忘记重新生成"的陈旧风险。改为派生模块：数据 100% 机器派生、导入即构建、永不手工维护，也就没有可陈旧的缓存（Cache 失效问题从根上消除）。
- **Search Corpus 由 IR 生成**：索引需要 token 化 structuredData，塞进 IR 会把它变成巨型正文转储，违反 IR 只存元数据的原则。Search 有意留在 source 管线（`createFromSource` 在 build 进程内复用同一份已加载的 source，不构成同进程重复扫描），是 IR 之外唯一被声明的内容消费方；索引生成（构建期）与 Search UI（客户端）保持分离。
- **保留 `--allow-client-fallback`**：其服务场景（构建环境无 Puppeteer）随 verify-only prebuild 一并消失；降级修剪 manifest 会静默放弃静态资产。改为严格 verify：IR 中每张图必须有清单条目、重算哈希一致且文件存在，失效条目同样失败，并提示运行 `generate:content`。客户端运行时兜底（fetch miss → 浏览器渲染）保留为鲁棒性措施，不作为构建策略。

## 决策要点

- **IR 条目**：稳定 Content ID、locale、url、slugs、title、description、生命周期与维护元数据、`contentRevision`、sourcePath（posix 相对路径）、Content Schema v2 元数据与 `mermaid`（页面内规范化图表源码数组）。不含正文；`structuredData` 之类大体量数据留在各自消费方。
- **单一规范化**：Mermaid 栅栏扫描从脚本私有能力迁入内容层（`src/content/mermaid-text.ts`），由 source 页面清单驱动（读 `info.fullPath`），不再自行递归目录；共享哈希工具移至 `src/lib/mermaid-id.ts`，构建端与浏览器端继续调用同一函数保证身份一致。
- **管线**（`scripts/content-pipeline.ts`，`mermaid-assets.ts` 共享命名/清单逻辑、`mermaid-renderer.ts` 仅被动态导入）：generate 按内容寻址增量渲染（源码 + 渲染器签名 + 配置哈希为文件名，全命中时零浏览器启动）并清理失效资产；verify 重算期望文件名与清单、磁盘三方对账。
- **生成物与 Git 策略**：提交仓库——Mermaid SVG（`public/mermaid/`）与资产清单（`src/features/mermaid/generated/assets.ts`），保证 clone 即可 verify 构建；构建期生成、不提交——`.source/`（fumadocs-mdx）与 `out/`；无新增缓存目录，IR 不落盘。

## 后果

- 生产构建（`prebuild` → `next build`）不再 import Puppeteer、不再启动 Chromium；资产缺失或过期（含 mermaid 版本升级、样式/配置变化引起的哈希变化）在 verify 阶段硬失败并给出修复命令。
- 内容扫描从"每步骤各自理解"收敛为每进程一次 IR 派生；同一构建链路仍有两个进程（Bun 管线、next build）各自加载 source 一次，这是不物化 IR 的既定代价。
- 改动 MDX 中的 Mermaid 图表后必须运行 `bun run generate:content`（predev 自动执行），否则 `check:content` 拦截。
