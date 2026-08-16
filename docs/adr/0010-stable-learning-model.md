# Stable Learning Model：显式原语与页面级 Registry

Status: accepted

此前文档进度把所有 GFM Checkbox 当作任务，并以 pathname 与文本 Hash 推断身份；这会把普通 Checklist 与学习状态混在一起，也无法稳定承受文案、顺序或 URL 变化。我们决定以显式 `Lab` / `Task` 作为最小 Learning Primitive，使用 `contentId + labId + taskId` 作为稳定身份，并由页面级 Learning Registry 提供结构化任务数据；旧 GFM 行为继续作为兼容模式，不批量迁移存量文档。

## 决策

- **语义分离**：普通 GFM Checkbox 保持 Checklist 语义；只有嵌套在 `<Lab id>` 中的 `<Task id>` 才进入新 Learning Registry 与稳定学习存储。
- **稳定身份**：`contentId` 复用现有稳定 Content ID；`labId` 在内容内唯一，`taskId` 在 Lab 内唯一。显示文本、标题、DOM 顺序、pathname 与 URL 不参与身份。
- **最小模型**：当前只实现 `task`。模型为未来的 `checkpoint` / `practice` 保留原语类型，但不提前引入课程、账号或统计系统。
- **Registry 数据流**：页面级 Provider 收集 Labs 与 Tasks 的结构化 descriptor；进度组件优先消费 Registry。DOM 仅保留 Legacy Checklist 统计与局部跳转定位用途。
- **版本化本地状态**：新状态使用独立的 `neoverse-learning-state:v1:<contentId>` Schema，状态记录包含 `labId`、`taskId`、`kind` 与 `completed`。
- **安全兼容**：旧 pathname / 文本 Hash 状态继续供 GFM 兼容模式使用。v1 → v2 迁移只对通过校验的数据执行，在目标写入可验证后删除来源；目标已有数据时合并且不覆盖目标。旧 Hash 不猜测映射到新 Task。

## Considered Options

- **继续把所有 Checkbox 当作 Learning Task**：实现成本低，但无法表达 Checklist 与学习任务的不同生命周期，也会让文案修改、排序和 DOM 变化影响状态身份。
- **用 pathname 或文本 Hash 生成新 Task ID**：可以避免作者补写 id，但 URL 与文案正是需要被允许修改的内容，不能承担稳定身份职责。
- **为所有存量 Checkbox 批量补写 `<Task>`**：会把作者原本的 Checklist 意图改成学习语义，并扩大迁移风险；本轮只在代表性页面增加少量显式任务。
- **让进度组件继续扫描全页 DOM**：能兼容旧页面，但会产生第二份隐式任务模型；Registry 能直接表达结构化任务，DOM 仅保留兼容与定位职责。

## Consequences

- 新页面可以明确选择哪些内容需要持久化学习状态；普通 Checklist 不会被误计入学习进度。
- 页面标题、任务文案、文件位置和 URL 调整不会改变新 Task 的已有状态；显式 ID 调整或移动到另一个 Lab 则代表新的学习身份。
- 存量 GFM 页面无需批量改写，已有本地状态仍可在兼容模式下读取；无法可靠匹配的数据保持原样，不强行迁移。
- 当前没有账号同步、数据库、排行榜、课程后台、Dashboard 或成就系统。
