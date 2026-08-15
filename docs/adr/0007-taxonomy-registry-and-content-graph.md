# Taxonomy Registry 与 Stable Content ID 内容图谱

Status: accepted

Content Schema v2 曾在 Schema 中维护 type、track、difficulty 的合法值，并把 topics 留为开放格式校验；这会让合法 ID、显示文案和排序分散，也无法为知识图谱提供唯一的关系模型。我们决定以 `src/content/taxonomy/` 作为四个维度的唯一 Registry，Schema 从 Registry 派生合法值，并将数组语义的 `track` 统一更名为 `tracks`，不保留双字段兼容层。

## Considered Options

- **继续允许开放 topics**：新增 Topic 无法同时获得双语名称、排序和描述，且消费者仍需各自维护显示映射；改为显式登记后才能使用。
- **按 locale 或 URL 建图**：翻译、改名和路由调整会把同一逻辑内容拆成多个节点；改为使用既有 Stable Content ID。
- **让 related 自动对称**：会把推荐作者未声明的内容写入正向关系；改为保留有向 `related`，只生成 `relatedBy` 反向索引。
- **在 Compiler 中静默选择一个 locale 版本**：IR 的 locale 顺序会变成隐式权威来源；改为合并已声明关系，并在两个 locale 都显式声明同一字段但集合不一致时使 Content Check 失败。

## Consequences

- `src/content/graph/` 只消费 Content IR，不重新扫描 MDX；节点按 Stable Content ID 聚合并暴露前向、反向读取 API。
- prerequisite 关系是 DAG。Content Check 保留目标不存在、自引用、重复关系检查，并输出完整 Content ID 环链路。
- 未声明关系的语言版本可渐进补标；显式冲突必须修复，避免图谱在不同构建或消费者中出现不确定边。
