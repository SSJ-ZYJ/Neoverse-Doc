# 架构层依赖收敛为严格单向 DAG

ADR 0001 建立了按"允许关系集合"表达的层依赖矩阵，其中 `lib ↔ dictionaries` 是唯一有意双向对，adapters 层还挂着 4 条 `EXCEPTIONS` 例外。随着 Content IR（ADR 0004）把 SEO 与首页章节数据迁入 content 层、docs-shell 特性成立，这些双向对与例外失去了存在理由。我们决定把矩阵收敛为严格单向 DAG：任意两层不得互相引用，`EXCEPTIONS` 清零，并由检查器在启动时做环检测。

## 考虑过的选项

- **保留 lib ↔ dictionaries 双向对**：两者同属"站点胶水"的说法在 `lib/seo.ts`、`lib/home-sections.ts` 存在时成立；这两个文件本质是内容派生数据（消费 Fumadocs source 与字典），迁入 `content` 层后 lib 只剩纯工具函数，不再有任何理由反向依赖 dictionaries。保留双向对只剩成本。
- **用例外维持 adapters 的桥接导入**：`deferred-docs-page` / `deferred-toc-state` 同时组合 Fumadocs 组件、React 状态与项目导航运行时，这不是"隔离第三方"的适配器职责，而是产品特性。继续用 `EXCEPTIONS` 掩盖只会让 adapters 语义持续稀释。`layout.tsx` 的两个例外（NavTitle、字典文案）则可通过依赖注入彻底消除。

## 决策要点

- **层职责重划**：
  - `features/docs-shell`（新）：文档页产品组合，包括路由切换期间的 TOC 保留。从 `adapters/fumadocs` 迁入 `deferred-docs-page`、`deferred-toc-state`。
  - `content`：内容与知识数据基础设施，收编 `seo.ts`（原 `lib/seo.ts`）与 `home-sections.ts`（原 `lib/home-sections.ts`）。
  - `adapters`：只做第三方接缝（fumadocs-ui 配置、source、DOM 访问器），产品内容一律依赖注入 —— `baseOptions(locale, { navTitle, guestbookTitle })` 由 app 层调用方注入。
  - `lib`：纯工具叶子层，不依赖任何项目层；`dictionaries` 仅依赖 lib，方向单一。
- **矩阵即 DAG**：`detectLayerCycles()` 用 Kahn 拓扑排序在扫描前校验矩阵无环，成环即失败——"上下层"语义由此获得机器保证，检查器能够阻止项目重新演化成环形依赖。
- **EXCEPTIONS 清零**：例外机制保留（新条目必须附充分理由），但当前为零；历史 4 条全部通过正确边界（迁移 + 依赖注入）消除，而非放宽矩阵。
- **零引用边警告 + CSS 豁免**：扫描后统计实际使用的矩阵边，零引用的允许边告警提示剪除；唯一豁免 `app → ui`（经 `globals.css` 的 CSS `@import` 消费，对 TS 扫描不可见，登记在 `CSS_CONSUMED_EDGES`）。

## 后果

- 最终依赖图（自上而下）：`app → { features, runtime, content, adapters, components, lib, dictionaries, ui, styles }`；`features → { runtime, content, adapters, lib, dictionaries }`；`runtime → adapters`；`content → { adapters, lib, dictionaries }`；`adapters → lib`；`dictionaries → lib`；`lib`、`ui`、`styles` 为叶子。共 25 条边、24 条活跃。
- 本轮消除的双向依赖：`lib ↔ dictionaries`（seo/home-sections 迁入 content）；`adapters → runtime`、`adapters → components`、`adapters → dictionaries`（docs-shell 迁移 + baseOptions 注入）。
- 调用方契约变化：`baseOptions` 签名增加必填 `inputs` 参数；`DeferredDocsPage` 改从 `@/features/docs-shell` 公共入口导入。
- `components` 仍是迁移过渡层（矩阵保留其对 features/runtime/content/lib/dictionaries 的边）；未来若继续收敛，应在独立决策中处理，不与本轮 DAG 目标混同。
