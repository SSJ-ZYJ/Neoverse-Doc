# Continue Learning：最小本地活动与确定性下一步

Status: accepted

已有 Stable Content ID、Learning Registry、Local Progress、Learn Projection 与 Content Graph。Continue Learning 需要在不引入账号、后端或完整阅读轨迹的前提下，把“最近读到哪里”和“下一步读什么”连接起来。页面标题与 URL 都是 Manifest 的派生位置数据，不能成为本地状态身份。

## 决策

- **独立活动状态**：新增版本化的全局本地状态 `neoverse-learning-activity:v1`，记录集合只包含 `contentId`、可选 `trackId`、`lastVisitedAt` 和可选的 `{ completed, total }` 进度快照。
- **单内容一条记录**：同一 Stable Content ID 只保留最近一条记录，最多保留有限数量的最近内容；不保存访问事件、滚动位置或完整阅读轨迹。
- **访问时机**：公开可索引文档在客户端挂载时记录一次访问；页面没有 Learning Task 时仍可作为“继续阅读”入口，但不写入伪造的 `0 / 0` 进度。
- **Registry 是进度来源**：页面的 Task 数量与完成数只从 Learning Registry 读取。任务变化时更新活动中的进度快照；只有 `total > 0` 的快照才可用于完成或进行中状态。
- **Manifest 解析位置**：首页和 Track 页面把本地 `contentId` 交给当前 Manifest / Projection 目录解析标题、URL 与 Track 文案；这些字段不进入存储。
- **Track 状态**：Track 页面只对具有可靠 Progress 的步骤显示“当前学习位置”“已完成”或“进行中”。当前位置由最近活动记录确定，完成条件为 `completed === total && total > 0`。
- **推荐顺序**：当前页面完成后，先扫描当前 Track 中当前步骤之后的就绪步骤，再按 Learn Projection 的 Track 顺序扫描全部就绪步骤；步骤的所有 `prerequisiteIds` 必须存在于已完成 Content ID 集合中。没有满足项则不显示推荐。
- **清理与兼容**：解析失败或版本不匹配的活动状态清空；读取时依据当前 Manifest 清除不存在或不可索引的 Content ID，页面移动只改变 URL 不清除记录。既有按内容保存的 `neoverse-learning-state:v1:<contentId>` 任务状态继续按原 Schema 读取，不从任务完成状态猜测过去的访问历史。

## Considered Options

- **按 pathname、标题或 slug 保存最近位置**：实现简单，但页面移动、改名或翻译会使记录失联，违背 Stable Content ID 的身份边界。
- **保存完整访问历史**：可以提供更复杂的历史页，但超出 Continue Learning 所需信息，增加隐私、容量和清理成本。
- **把页面标题和 URL 一起写进活动记录**：可以减少一次 Manifest 查找，却会产生迁移失效的冗余数据，并让页面移动时出现旧链接。
- **在没有 Learning Task 时显示百分比**：能让所有页面看起来统一，但会把普通阅读伪装成可量化学习进度。
- **随机或模型推荐下一内容**：无法解释、难以测试，也会绕过 Learn Projection 与 Knowledge Graph 已有的作者声明关系。

## Consequences

- Continue Learning 保持静态导出与 Local-first，不需要账号、服务端状态、数据库或请求时计算。
- 首页没有有效活动时客户端岛返回空，不插入空状态，也不改变原首页布局；有活动时标题和 URL 始终来自当前 Manifest。
- Task Progress 的快照可能因内容模型变化而被清除或不再显示，但不会破坏原有每页任务状态。
- Activity 记录跨语言共享 Stable Content ID；切换语言或移动页面不会复制出另一份历史。
