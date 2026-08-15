// Content relation check: validates Content Schema v2 cross-page metadata
// against the compiled Content Manifest. Enum / format / numeric constraints
// live in the zod schema and are enforced wherever frontmatter is compiled;
// this script owns the checks that need the whole-content view:
//   1. Content ID uniqueness (per id + locale)
//   2. prerequisites / related reference existence (locale-loose: an ID valid
//      in ANY locale passes — translation gaps must not break relations)
//   3. self-reference guard
//   4. translation pairing contract: all locale variants sharing one stable id
//      must live at the same slugs (fumadocs dir-based pairing still relies on
//      symmetric paths — see docs/adr/0003)
// Frontmatter only materialises inside the Next pipeline, so we register the
// official fumadocs-mdx Bun plugin before importing the manifest — otherwise
// page data comes back empty under plain Bun. Run via `bun run check:content`
// (regenerates .source first) or as part of prebuild. See docs/adr/0002.
// 内容关系校验：基于编译后的 Content Manifest 校验 Content Schema v2 的跨页
// 元数据。枚举 / 格式 / 数值约束位于 zod schema，在 frontmatter 编译处强制；
// 本脚本只负责需要全量内容视角的检查：
//   1. Content ID 唯一性（id + locale 维度）
//   2. prerequisites / related 引用存在性（宽松 locale 语义：任意语言存在
//      即可通过 —— 翻译缺口不应破坏内容关系）
//   3. 自引用防护
//   4. 翻译配对契约：共享同一稳定 id 的各语言版本必须位于相同 slugs
//      （fumadocs 目录式配对仍依赖路径对称 —— 见 docs/adr/0003）
// frontmatter 只在 Next 管线内物化，因此导入 manifest 前先注册官方
// fumadocs-mdx Bun 插件 —— 否则在纯 Bun 下页面数据为空。
// 通过 `bun run check:content` 运行（会先重新生成 .source），亦挂入 prebuild。
// 决策依据见 docs/adr/0002。
import { createMdxPlugin } from 'fumadocs-mdx/bun';

// Narrow local view of the Bun global — avoids a bun-types devDependency for
// one call site. The script only ever runs under Bun (see check:content).
// Bun 全局类型的窄化本地视图 —— 避免为单一调用点引入 bun-types 开发依赖。
// 本脚本只在 Bun 下运行（见 check:content 脚本）。
interface BunGlobal {
  plugin: (plugin: unknown) => Promise<unknown>;
}
const bunGlobal = (globalThis as { Bun?: BunGlobal }).Bun;

if (bunGlobal === undefined) {
  console.error('Content check must run under Bun: Bun.plugin is unavailable.');
  process.exit(1);
}

await bunGlobal.plugin(createMdxPlugin());
const { contentManifest } = await import('../src/content/generated/manifest');

interface Violation {
  identity: string;
  field: string;
  message: string;
}

const violations: Violation[] = [];

// --- 1. Content ID uniqueness (id + locale) --------------------------------
const seenIdentities = new Set<string>();
for (const entry of contentManifest) {
  const identity = `${entry.id}:${entry.locale}`;
  if (seenIdentities.has(identity)) {
    violations.push({
      identity,
      field: 'id',
      message: 'Content ID 在同一 locale 下重复，请检查文件组织',
    });
  }
  seenIdentities.add(identity);
}

// --- 1b. Translation pairing: one stable id must map to one slug path ------
// The stable id is locale-independent by design, but fumadocs dir-based i18n
// pairing still resolves translations from symmetric paths. Make that implicit
// dependency an explicit contract: locale variants sharing an id must share
// the same slugs, otherwise page tree / alternates / routing silently split.
// 翻译配对：稳定 id 按设计与 locale 无关，但 fumadocs 目录式 i18n 配对仍从
// 路径对称性解析翻译。把这一隐式依赖升级为显式契约：共享同一 id 的各语言
// 版本必须位于相同 slugs，否则 page tree / alternates / 路由会静默分裂。
const slugPathsById = new Map<string, Map<string, string[]>>();
for (const entry of contentManifest) {
  let variants = slugPathsById.get(entry.id);
  if (variants === undefined) {
    variants = new Map();
    slugPathsById.set(entry.id, variants);
  }
  variants.set(entry.locale, entry.slugs);
}
for (const [id, variants] of slugPathsById) {
  const distinctPaths = new Set([...variants.values()].map((slugs) => slugs.join('/')));
  if (distinctPaths.size > 1) {
    const detail = [...variants.entries()]
      .map(([locale, slugs]) => `${locale}=${slugs.join('/')}`)
      .join(', ');
    violations.push({
      identity: id,
      field: 'id',
      message: `同一稳定 id 的各语言版本 slugs 不一致（${detail}）；翻译配对要求路径对称，请移动文件或拆分 id`,
    });
  }
}

// --- 2 & 3. Relation existence (locale-loose) + self-reference -------------
const knownIds = new Set(contentManifest.map((entry) => entry.id));
const RELATION_FIELDS = ['prerequisites', 'related'] as const;

for (const entry of contentManifest) {
  for (const field of RELATION_FIELDS) {
    const references = entry[field];
    if (references === undefined) continue;
    for (const reference of references) {
      if (reference === entry.id) {
        violations.push({
          identity: `${entry.id}:${entry.locale}`,
          field,
          message: `自引用 '${reference}'：内容不应以自身为前置或相关项`,
        });
        continue;
      }
      if (!knownIds.has(reference)) {
        violations.push({
          identity: `${entry.id}:${entry.locale}`,
          field,
          message: `引用了不存在的 Content ID '${reference}'（任意 locale 均无此内容）`,
        });
      }
    }
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(
      `Content check violation: [${violation.identity}] ${violation.field}\n  ${violation.message}`,
    );
  }
  console.error(
    `\nContent check failed: ${violations.length} violation(s) across ${contentManifest.length} manifest entries. ` +
      'Rules: scripts/check-content.ts · Schema: src/content/schema/docs.ts · Decisions: docs/adr/0002, docs/adr/0003',
  );
  process.exitCode = 1;
} else {
  const relations = contentManifest.reduce(
    (sum, entry) => sum + (entry.prerequisites?.length ?? 0) + (entry.related?.length ?? 0),
    0,
  );
  const annotated = contentManifest.filter((entry) => entry.type !== undefined).length;
  console.info(
    `Content check passed: ${contentManifest.length} entries, ${annotated} typed page(s), ` +
      `${relations} relation reference(s), all references resolved.`,
  );
}
