# 建立 Feature Boundary：跨 Feature 依赖默认禁止

ADR 0001 / 0005 建立了顶层层的严格单向 DAG，但检查器对同层导入整体放行（`targetLayer === sourceLayer` 即跳过）：`features/search → features/tasks/internal` 这类跨 Feature 深度依赖不会被发现。同时，Barrel 规则只对跨层消费者生效，Feature 之间的隐性耦合完全没有机器约束。我们决定把每个 `features/<name>` 顶层目录升级为一等边界（Feature Boundary）：跨 Feature 导入默认禁止，获准的依赖也必须经由目标 Feature 的公共入口，且真实依赖边必须保持无环。

## 考虑过的选项

- **只保留现有跨层 Barrel 规则**：无法覆盖同层 Feature 互导 —— 这正是隐性耦合的主要通道（共享 store、hooks、runtime 内部件）。规则不覆盖等于不存在。
- **零容忍：禁止一切 Feature 互导**：`community` 的留言板返回导航复用 `transition` 的 `BackLink` 是正确的业务关系；为消灭最后一条边而复制 BackLink 内部逻辑或引入事件总线，属于为纯洁架构人为制造复杂度。
- **Feature 间事件总线 / 共享状态通信**：当前仅 1–2 条真实跨 Feature 边，间接层的维护成本远高于收益；总线还会让依赖关系从导入图里消失，反而更难审计。

## 决策要点

- **Feature Public API**：每个 Feature 的 `index.ts` 是其唯一对外契约（Public Entry），只导出其他层或 Feature 真正消费的符号；不建全量 re-export 的 Mega Barrel，也不允许无入口的裸目录。现状审计：7 个 Feature 全部已有精瘦入口（2–6 个导出），无需增删。
- **统一边界规则**：任何导入跨越 Feature 边界 —— 无论来自其他层还是其他 Feature —— 都必须解析为目标 Feature 的 `index.ts` 本身（`@/features/<name>`）；相对路径经归一化后同样落入此规则。
- **默认禁止 + 最小许可清单**：feature→feature 依赖默认 hard fail（进 `prebuild` 门禁，无过渡期）。确属正确业务关系的直接依赖登记进 `FEATURE_ALLOWLIST`（源 Feature → 目标 Feature → 必填理由）。登记与否都不豁免公共入口要求。
- **Feature Cycle 检测**：对扫描所得的**真实**依赖边（而非许可清单）跑 Kahn 拓扑排序，有环即失败 —— 即使所有边都已获准。
- **卫生机制**：不再被真实导入命中的许可条目触发告警，防止清单腐化（与 `EXCEPTIONS` / 零引用边警告同风格）。
- **共享代码归属优先**：修复跨 Feature 导入时发现 A、B 都需要 X，先判断 X 真实属于 runtime / content / design-system(ui) / lib 哪一层再提取；禁止新建 `shared/`、`common/`、`utils/` 垃圾桶目录。本轮实例：`isPlainInternalNavigation` 是纯导航谓词而非转场逻辑，下沉 `runtime/navigation/event.ts`，`reading → transition` 边随之消失。
- **保留的直接依赖**：`features/community → features/transition`（BackLink，留言板返回导航），登记理由后保留 —— 全仓零跨 Feature 边不是目标。

## 后果

- 检查器新增三项能力：跨 Feature 深导入拒绝、未许可公共入口依赖拒绝、真实边环检测（三项均通过负向测试验证）。
- `transition` 的公共契约收缩：`isPlainInternalNavigation` 移出 `index.ts`，改由 `@/runtime/navigation/event` 提供；`transition-provider`、`reading`、`community` 三处消费方同步切换。
- 新增 Feature 的边界规则：① 必须有 `index.ts` 且只导出真实契约（外部无人消费的导出 = 删）；② 内部目录结构自由；③ 跨 Feature 导入默认失败，确需时先问"该下沉公共层吗"，答案为否才进 `FEATURE_ALLOWLIST`；④ 多 Feature 共需的实现按归属提取到对应层，不复制、不建垃圾桶目录。
- 术语进入 `CONTEXT.md`（Feature / Feature Boundary / Public Entry / Cross-feature Allowlist）；一个 Feature 可以内部复杂，但复杂度不能通过任意 import 泄漏到其他 Feature。
