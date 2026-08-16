# Product Projection Layer 与 Search Schema v2

Status: accepted

Content Schema v2、Manifest、Taxonomy Registry 与 Content Graph 已经提供规范内容模型，但产品功能若各自读取页面树、Frontmatter 或关系字段，就会重新形成局部分类和重复扫描。我们决定在 src/content/projections 建立纯数据 Product Projection Layer：Learn 按 Track、Taxonomy 顺序与显式 prerequisite 边输出稳定 Content ID；Explore 只按显式 Topic 聚合；Reference 只按 Content Type 准入。Projection 不维护显示名称或第二份 metadata，Feature/UI 从 Manifest 与 Registry 解析它们。

## Considered Options

- **让 Feature 直接消费 Manifest / Taxonomy / Graph**：短期少一层函数，但会把产品排序、筛选和关系语义重复到 Feature 边界，难以保证 Learn、Explore 与未来页面的一致性。
- **把 structuredData 正文写入 Content IR**：能让 Search 与其他投影共享同一对象，却会把元数据 IR 变成全文转储，违背 ADR 0004 的构建管线边界。
- **替换或重建 Fumadocs 的全文搜索 Schema**：可让 taxonomy 字段原生出现在底层每条结果中，但会重做成熟的静态索引、导出和结果分组，带来不必要的搜索质量风险。

## Consequences

- Search Corpus 继续由 Fumadocs structured content 提供正文，并通过 docs:<stable-id>:<locale> 与 Manifest 派生的 Search Metadata Projection 连接；缺失 Join 会使构建失败。
- Search Schema v2 以应用层 Search Document 表达 contentId、locale、标题、描述、heading、正文和 taxonomy；静态 Metadata Sidecar 不复制正文。
- 既有 Chapter Scope 保留为原始 tag；Track、Topic、Content Type 与 Difficulty 以 namespaced tags 写入现有静态索引。Search UI 通过 Taxonomy Registry 投影提供单维度筛选，并以多 tag AND 语义组合不同维度；搜索功能不重新解析 Frontmatter，也不改变 tokenizer 与 ranking。
