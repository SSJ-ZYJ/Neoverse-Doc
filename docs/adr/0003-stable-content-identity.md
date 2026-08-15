# 稳定 Content Identity：显式 frontmatter id 取代路径派生

Status: accepted（部分取代 [ADR 0002](./0002-content-schema-v2.md) 中「Content ID 继续由 slug 派生」与「不引入 translationKey」的论证前提）

ADR 0002 拒绝显式 id 的理由是「重命名频率低、引用密度低、维护成本先于收益」。该前提已变化：任务进度等用户状态此前按 URL pathname 持久化，文件改名即丢数据；内容关系引用已落地且将服务于 /learn、知识图谱等未来消费方。因此每页 frontmatter 显式声明必填的稳定 `id`（裸值，如 `ch1/1.12-Shell-Basics`），manifest 以 `docs:` 前缀派生完整 Content ID；中英文版本声明相同 `id` 显式配对。文件移动、URL 调整、标题修改都不再改变身份。

## 考虑过的选项

- **初始值人工重命名（如 `git-basics`）**：语义更干净，但 68 页主观命名是独立的内容工程；本轮目标是身份与位置解耦而非命名美化。改为机械取值 `id = slugs.join('/')`，manifest ID 与迁移前逐字节相同，4 个 pilot 页引用、sitemap、check-content 全部零改动；未来单页改名只需改该页 `id` 与引用。
- **`aliases` 兼容旧 ID**：旧 ID 无任何持久化消费方（frontmatter 引用仅 4 处且构建期可拦截），不需要兼容层。等未来出现「已有外部引用的 ID 需要重命名」的真实案例再评估。
- **允许 zh/en 同 id 但路径不对称**：fumadocs 目录式 i18n 配对（page tree、alternates、路由）仍依赖路径对称，真正解耦路径超出本轮「只解决 Content Identity」的边界。改为把隐式依赖升级为显式契约：check-content 校验同 id 各 locale 的 slugs 必须一致。

## 决策要点

- **两层形态**：frontmatter 作者层写裸值（禁止空白与 `docs:` 前缀，允许 `字母数字 - . /`）；manifest / `prerequisites` / `related` / 客户端持久化使用 `docs:<id>` 前缀形态，与引用格式天然区分防混用。
- **一次性补齐**：临时 codemod 机械写入全部 68 页（.md 与 .mdx）后删除；schema 将 `id` 设为必填，缺失即编译失败。
- **翻译配对**：同 `id` 显式配对 + check-content「同 id ⇒ slugs 一致」契约；`translationKey` 仍不引入（显式 id 已承担职责）。
- **运行期状态切换**：任务进度 key 从 `neoverse-mdx-task-state:v1:<pathname>` 切换到 `v2:docs:<id>`，同一内容跨语言共享进度；页面首次访问时懒迁移（v2 为空则搬运 v1 数据，v1 key 随即删除，先访问的语言赢得合并）。服务端页面经 `ContentIdProvider`（`src/runtime/content-id.tsx`）向客户端下发身份；MDX 预览等无 Provider 场景回退 pathname keying。
- **搜索记录身份**：索引记录 `id` 从 `page.url` 换为 `docs:<id>:<locale>`（客户端仅用其去重，导航走 `url`），记录身份在 URL 调整后保持稳定。

## 后果

- 重命名文件或调整 URL 不再断链 Content ID、不再丢任务进度；改 `id` 才会，且 `bun run check:content` 构建期拦截漏改引用。
- 仍暂时依赖路径（slugs + locale）的系统：路由与页面渲染、SEO alternates 与面包屑、fumadocs page tree 与 `meta.json`、docs-source 端点、阅读返回 / 恢复点（sessionStorage，生命周期短不值得迁移）、搜索索引的导航字段（`url`）。
- 新增文档必须声明 `id`；新页默认取与最终路径一致的值即可，稳定后不再随路径变化。
