# Neoverse-Docs

一份面向计算机初学者的中英双语技术知识库。本文件是项目的领域术语表：统一定义内容身份、位置与语言版本的概念边界，防止“身份”与“地址”混用。

## Language

### 内容身份

**Content ID（内容标识）**:
`docs:` 前缀加稳定 id 构成的完整逻辑身份，跨语言共享，用于内容关系引用与用户状态持久化。
_Avoid_: slug id、path id、URL id

**Stable ID（稳定 id）**:
页面 frontmatter 中声明式维护的裸值身份；一经声明不随文件移动、URL 调整或标题修改而变化。
_Avoid_: slug、文件名、translationKey

### 构建管线

**Content IR（内容中间表示）**:
从 Fumadocs 内容源单遍机器派生的规范化内容数据面，是所有构建步骤唯一的元数据来源；不物化为文件，永不手工维护。
_Avoid_: 手工维护的 IR、第二套内容扫描

**Content Prepare（内容准备）**:
开发 / 内容准备阶段的构建活动：派生 IR、校验内容、增量生成派生产物（如 Mermaid 资产）；重型渲染只发生在此阶段。
_Avoid_: 生产构建期渲染

**Derived Artifact（派生产物）**:
由 IR 计算出的数据或资产（Manifest、Mermaid SVG 与资产清单、搜索索引）；只允许重新生成，不允许手工修改。
_Avoid_: 手工编辑生成物

**Artifact Verification（产物校验）**:
生产构建门禁：将派生产物与 IR 按哈希与存在性对账，只校验、不渲染、不启动重型工具。
_Avoid_: 校验时重新渲染

**Content Manifest（内容清单）**:
面向消费方的页面数据视图，由 Content IR 派生并剥离构建期专属字段：`id` 表达“是谁”，`url` / `slugs` 表达“在哪里”，`locale` 表达“哪种语言”。
_Avoid_: 独立于 IR 的第二套清单

**Content Lifecycle（内容生命周期）**:
内容在维护过程中的唯一状态语义：`draft`、`review`、`stable`、`deprecated`。状态描述内容当前的发布与维护阶段，不是翻译关系或访问权限。
_Avoid_: 同时用 `draft` 布尔值和 `status` 表达状态

**Review Metadata（复核元数据）**:
作者对技术内容仍然有效的最近一次人工确认记录；日期只表达确认事实，不等同于文件修改时间或 Git 提交时间。
_Avoid_: 用 mtime 推断内容已复核

**Freshness Policy（新鲜度策略）**:
按内容分类决定复核周期的集中规则；它只产生维护提醒，不改变生命周期，也不把复核周期复制到每个 UI 组件。
_Avoid_: 由组件或 URL 局部推导复核周期

**Translation Drift（翻译漂移）**:
source 内容更新后，其他语言版本尚未确认对应 source revision 的维护状态；通过 Stable Content ID 配对，并区分 `missing`、`outdated` 与 `up-to-date`。
_Avoid_: 仅凭文件名、目录、URL 或 mtime 判断翻译同步

### 质量门禁

**Quality Gate（质量门禁）**:
Pull Request 合并前的自动检查集合，把仓库的本地约束（架构边界、内容校验、类型检查、Lint、测试）升级为可执行检查；main 上的生产构建只执行一次完整静态导出，不重复运行门禁子检查。
_Avoid_: 在 CI 中重复执行 prebuild 已含的检查、把 Mermaid 重新生成当作常规门禁

**Verify-only CI（仅校验的 CI）**:
CI 与生产构建只对 Mermaid 等派生产物做哈希对账（Artifact Verification），从不重新生成；生成只发生在本地 Content Prepare 阶段，产物随内容一并提交。
_Avoid_: 在 CI / 生产构建中启动 Puppeteer 重新渲染

### 知识模型

**Taxonomy Registry（分类注册表）**:
`type`、`topics`、`tracks` 与 `difficulty` 的合法 ID、显示顺序、双语名称和描述的唯一来源。
_Avoid_: Schema 中的重复 enum、页面或功能局部维护的标签映射

**Content Graph（内容图谱）**:
由 Content IR 按 Content ID 聚合出的 locale 无关关系图，每个节点代表一个逻辑内容而非某个语言页面。
_Avoid_: 按 URL 或 locale 页面建图、重新扫描原始 MDX

**Prerequisite Relation（前置关系）**:
从内容指向其学习前置内容的有向边，必须构成无环图。
_Avoid_: 阅读顺序、相关推荐

**Related Relation（关联关系）**:
由作者显式声明的有向推荐边；`relatedBy` 只是其反向索引，不会自动成为目标内容的 `related`。
_Avoid_: 自动对称关系、前置关系

### 产品投影与搜索

**Product Projection（产品投影）**:
由 Content Model 纯计算得到、面向产品功能的数据视图；只引用稳定 Content ID 和 Taxonomy ID，不独立维护内容元数据。
_Avoid_: Feature 局部内容扫描、React/DOM 视图、第二份内容注册表

**Learn Projection（学习投影）**:
按 Track、Taxonomy 顺序与 Prerequisite Relation 组织的学习路线视图；显式前置边始终保留为稳定 Content ID。
_Avoid_: 把 Chapter 顺序当作学习分类、隐式忽略跨 Track 前置条件

**Explore Projection（主题浏览投影）**:
按作者显式声明的 Topic 聚合的主题浏览视图。
_Avoid_: 从 Chapter、slug 或 URL 推导 Topic

**Reference Projection（参考投影）**:
按统一 Content Type 准入的查阅型内容视图。
_Avoid_: 用 Chapter 位置、页面名称或局部标签判断参考内容

**Search Document（搜索文档）**:
由 structured content 正文和 Manifest 元数据通过 Stable Content ID 连接得到的细粒度搜索语料记录。
_Avoid_: 将正文塞入 Content IR、由 Search Feature 重新解析 Frontmatter

**Search Metadata Sidecar（搜索元数据侧车）**:
不含正文、按稳定页级搜索 ID 索引的 Search taxonomy 元数据视图，为未来的结果增强和过滤提供数据。
_Avoid_: 第二份全文索引、前端局部 Taxonomy 映射

### 位置与语言

**Slugs**:
页面当前的路径段序列，是位置描述而非身份，可随文件移动变化。
_Avoid_: 当作 Content ID 使用

**URL / Pathname**:
页面当前访问地址。任何以它为 key 的状态在 URL 变化后即失联。
_Avoid_: 作为身份、作为持久化 key

**Locale**:
语言版本（zh / en）。同一 Content ID 下的各 locale 是同一内容的不同语言版。

**Translation Pair（翻译配对）**:
共享同一 Content ID 的各语言版本；当前契约要求它们位于相同 slugs（路径对称）。
_Avoid_: translationKey

### 学习模型与用户状态

**Checklist（普通清单）**:
标准 GFM `- [ ]` 项，用于作者表达待办或核对事项；它不会因为使用 Checkbox 就自动成为学习任务。
_Avoid_: 把所有 Checkbox 视为 Learning Task

**Learning Primitive（学习原语）**:
作者显式声明、具有稳定身份和可持久化语义的学习内容单元；当前实现支持 `Lab` 与 `Task`。
_Avoid_: 从 DOM、显示文本或列表顺序猜测学习内容

**Learning Lab（学习实验组）**:
页面内承载一组相关 Learning Task 的稳定容器，由作者声明 `labId`。
_Avoid_: 用章节、标题或 URL 代替 Lab 身份

**Learning Task（学习任务）**:
位于 Learning Lab 内、由作者声明 `taskId` 的最小可完成学习单元；普通 Checklist 与它保持语义分离。
_Avoid_: 隐式把 GFM 任务项升级为 Learning Task

**Learning Identity（学习身份）**:
由稳定 `Content ID`、`labId` 与 `taskId` 组成的三元组；显示文本、标题、DOM 顺序、pathname 和 URL 都不属于身份。
_Avoid_: 文本 Hash、DOM 顺序、pathname 作为主要身份

**Learning Registry（学习注册表）**:
页面级的结构化学习数据视图，按 Content ID 暴露 Labs 及其 Tasks，供进度等消费方直接读取。
_Avoid_: 由消费方重新扫描正文 DOM

**Task Progress（任务进度）**:
Learning Task 或兼容模式 Checklist 的完成状态投影；进度是身份的消费结果，不反过来定义任务身份。
_Avoid_: 以显示文案或页面位置作为进度 key

### Feature 边界

**Feature（特性域）**:
`src/features/` 下的顶层目录，一个可内部复杂、但对外契约收敛的产品能力单元；内部结构自由，复杂度不得通过 import 泄漏到其他 Feature。
_Avoid_: 把 Feature 当作普通文件夹随意引用其内部

**Feature Boundary（特性边界）**:
Feature 目录的边界。任何跨越它的导入 —— 无论来自其他层还是其他 Feature —— 只能命中目标 Feature 的公共入口。
_Avoid_: 同层即放行、绕道相对路径

**Public Entry（公共入口）**:
Feature 的 `index.ts`，即该 Feature 的全部对外契约；只导出其他层或 Feature 真正依赖的符号，不是全量 re-export 的桶。
_Avoid_: Mega Barrel、无入口的裸目录

**Cross-feature Allowlist（跨特性许可清单）**:
架构检查中登记的、带理由的 Feature 间直接依赖白名单；默认禁止，登记后仍只能经公共入口导入，且真实依赖边必须保持无环。
_Avoid_: 用事件总线规避清单、为绕开边界复制代码
