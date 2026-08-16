# Content Maintenance Model：生命周期、Freshness 与翻译 Drift

Status: accepted

项目原先只有 `draft: boolean`，无法区分正在编写、等待复核、稳定内容与已经过时的页面；也没有独立表达“最近一次确认技术内容仍有效”的时间，更无法在不依赖 Git mtime 的情况下判断译文是否跟上 source。决定建立轻量、构建期可验证的 Content Maintenance Model，同时不重做 Content IR 或 Product Projection。

## 决策

### 生命周期

`status` 是唯一的内容生命周期字段，取值为：

- `draft`：仍在编写，保留现有正文软门控；
- `review`：正文可读，正在进行技术有效性复核；
- `stable`：当前认为稳定的内容，默认值；
- `deprecated`：仍保留访问，但不再作为当前推荐内容。

现有 `draft: true` 页面迁移为 `status: draft`；现有 `draft: false` 示例迁移为 `status: stable`。Schema 不再接受旧字段，因此不存在 `draft` 与 `status` 同时声明导致的双重语义。`review` 页面可索引；`draft` 与 `deprecated` 保留路由但不进入索引，deprecated 页面使用 `noindex, follow`。

### Deprecated replacement

`replacement` 是可选的 Stable Content ID，格式为 `docs:<id>`。只要声明，就必须指向存在的内容且不能自引用；它只允许出现在 `status: deprecated` 页面。Stable Content ID 在这里指稳定身份格式，不要求目标页面的生命周期必须为 `stable`。页面存在当前 locale 版本时显示该链接，否则回退到默认语言版本。

### Review Metadata 与 Freshness

`lastReviewed` 是作者人工填写的 `YYYY-MM-DD` 日期，只表达最近一次确认技术内容仍然有效的时间。它不从文件 mtime、commit 时间或其他 Git 历史推导；格式、日历日期和未来日期错误会阻断内容检查。

Freshness Policy 由集中维护策略提供，不由组件或页面重复声明：

| Policy | Review interval | 默认适用内容 |
| :--- | :---: | :--- |
| `fast-moving` | 90 天 | `reference`、`shell`、`terminal` |
| `normal` | 365 天 | `guide`、`operating-system`、`text-editing` |
| `stable` | 730 天 | `concept`、`architecture`、无分类页面 |

一个页面命中多个类型或 Topic 策略时使用最短周期。`review` 与 `stable` 页面缺少 `lastReviewed` 或超过周期时产生 Warning；`draft` 和 `deprecated` 不重复产生 Freshness 警告。Warning 不改变 `check:content` 的成功退出码。

### Translation Drift

默认语言 `zh` 是 source。所有语言版本通过 Stable Content ID 配对，不使用文件名、目录、URL 或 mtime 判断翻译关系。

构建期从 source 页面正文和读者可感知元数据计算 SHA-256 `contentRevision`。维护者完成译文同步确认后，在译文 frontmatter 写入对应值：

```yaml
reviewedRevision: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

`reviewedRevision` 相等表示 `up-to-date`；目标 locale 文件不存在表示 `missing`；译文存在但 revision 缺失或不匹配表示 `outdated`。现有译文不会被自动回填 revision，避免把未经确认的内容伪装成已同步。

### Pipeline 边界

`bun run generate:content` 与 `bun run check:content` 都从同一 Content IR 执行维护检查并输出 Translation Report：

- Schema 错误、非法 replacement、重复语言版本、无效生命周期或无效日期是 Error；
- Freshness 过期、缺少 `lastReviewed`、翻译 `missing` / `outdated` 是 Warning；
- Translation Report 按 Content ID 展示每个 locale 的 `missing`、`outdated` 或 `up-to-date`；
- Drift 与 Freshness 只服务维护者和 CI，不进入普通读者页面，也不建设健康度 Dashboard。

## 考虑过的选项

- **同时保留 `draft` 与 `status`**：会让两个字段都能表达发布状态，拒绝；采用一次性迁移，保证生命周期唯一语义。
- **用 Git mtime 代替 `lastReviewed`**：修改格式、翻译或自动生成文件都会改变时间，无法表达人工确认，拒绝。
- **按路径或文件名配对翻译**：文件移动或 URL 调整会破坏关系；沿用既有 Stable Content ID 配对。
- **让 Drift / Freshness 阻断生产构建**：翻译缺失和维护提醒不等同于 Schema 或关系错误；先作为 Warning，避免无意义阻断静态发布。

## 后果

- 生命周期、替代页、Freshness 和 Translation Drift 有唯一的内容维护语义；
- 现有页面首次运行会暴露缺少 `lastReviewed` 与 `reviewedRevision` 的 Warning，维护者需在实际复核或翻译确认后逐步补齐；
- Content IR 只增加维护所需的规范化字段与 source revision，Product Projection 不承担维护逻辑；
- deprecated 内容仍可通过旧链接访问，但不会污染 sitemap 与搜索索引；
- CI 能提供清晰的维护报告，同时继续把 Schema、关系与 replacement 错误作为硬门禁。
