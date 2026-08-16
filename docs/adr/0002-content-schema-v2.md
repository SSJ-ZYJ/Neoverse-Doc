# Content Schema v2 采用派生 Content ID 与全可选元数据字段

> 状态：本 ADR 中「Content ID 继续由 slug 派生」及拒绝显式 id / translationKey 的论证前提已被 [ADR 0003](./0003-stable-content-identity.md) 取代（现采用必填 frontmatter `id`，翻译配对由「同 id」显式承担）；开放 topics、`track` 字段与 Schema 内枚举的决定已被 [ADR 0007](./0007-taxonomy-registry-and-content-graph.md) 取代；本 ADR 对 `status` / `lastReviewed` 的否定决定已被 [ADR 0011](./0011-content-maintenance-model.md) 取代；其余字段决策继续有效。

为支撑从 Chapter-based Docs 演进为泛技术知识体系（/learn、Topic 聚合、Knowledge Graph、搜索排序），项目在 Frontmatter Schema 与 Content Manifest 中引入可选知识体系元数据。核心决策：**全部字段可选、Content ID 继续由 slug 派生、不做批量迁移**，仅以少量试点页面打通 Schema → Manifest → Validation 全链路。

## 考虑过的选项

- **显式 frontmatter `id`（重命名安全）**：每页手工维护一个 ID + 唯一性管理，约 50 个存量页面要么迁移要么双轨。现有文件名（数字编号 + 稳定命名）重命名频率低、v2 阶段引用密度极低，维护成本先于收益出现，故保留派生 ID。等 Knowledge Graph 落地、引用密度上来后再评估。
- **`translationKey` 字段**：fumadocs 的目录式 locale 配对（zh/en 同 slug 自动成对）+ manifest 中 locale 无关的派生 ID 已完整承担翻译键职责，手写 key 是可漂移的重复状态，不加。
- **`status` / `lastReviewed`（当时的决定）**：当时 `draft: boolean` 已存在且暂无维护消费方，因此未加入；该决定已由 ADR 0011 取代。
- **type 枚举扩到 guide/concept/tutorial/reference/essay 五值**：现有内容中 guide 与 tutorial 边界模糊、essay 无真实实例，故收敛为 `concept | guide | reference` 三值起步，出现真实边界再扩展。

## 决策要点

- **七个可选字段**：`type`（内容语义）、`topics`（多主题标签，与目录解耦）、`track`（学习路径）、`difficulty`（三值）、`estimatedMinutes`、`prerequisites` / `related`（指向 Content ID 的内容关系）。
- **词汇管控分化**：topics 是开放演化的 kebab-case 词汇，仅做格式校验；track 是少量产品级路径（未来挂本地化显示名），收敛为 schema 中的闭集注册表 `CONTENT_TRACKS`。
- **校验分层**：枚举 / 格式 / 数值约束由 zod schema 承担（fumadocs-mdx 编译期强制）；需要全量内容视角的检查（ID 唯一、引用存在、自引用防护）由 `scripts/check-content.ts` 承担，经 `bun run check:content`（先重新生成 `.source` 保证非陈旧）执行并挂入 prebuild。
- **宽松 locale 引用语义**：`prerequisites` / `related` 的目标在任意 locale 存在即合法——en 缺页是项目常态（`fallbackLanguage: null`），内容关系不应被翻译进度绑架；消费方按 locale 解析、缺失时降级。
- **不批量迁移**：全部字段可选，存量页面渐进补标；本轮仅以 zh 1.11 / 1.12 / 1.13（真实 prereq 链）、zh ch1/index（仅 track 的结构页）、zh about/project/architecture（reference 样本）与 en 1.12（镜像元数据验证跨 locale ID 稳定）验证链路。

## 后果

- **重命名即断链**：文件改名会更换 Content ID，必须同步更新所有 `prerequisites` / `related` 引用；`bun run check:content` 会在构建期拦截漏改。
- 后续 `/learn`、Topic 聚合、搜索排序与 Knowledge Graph 均以 Content Manifest 为唯一数据面消费这些字段，不重复解析磁盘内容。
- 旧文档的元数据补标按需渐进进行；未标注页面对所有消费方表现为"无该维度数据"，不产生错误。
