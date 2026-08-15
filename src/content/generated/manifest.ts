/**
 * Content Manifest — the consumer-facing view over the Content IR. Identity
 * and location fields are carried over verbatim; IR-only build information
 * (sourcePath, mermaid sources) is deliberately stripped so consumers such as
 * the sitemap see exactly the page data they need. All normalization lives in
 * the IR (see src/content/ir.ts and docs/adr/0004) — this module never touches
 * the content source again.
 *
 * Content Manifest —— 基于 Content IR 的消费视图。身份与位置字段原样透传；
 * IR 专属的构建期信息（sourcePath、mermaid 源码）被刻意剥离，sitemap 等
 * 消费方看到的就是所需的页面数据。全部规范化职责在 IR（见
 * src/content/ir.ts 与 docs/adr/0004）—— 本模块不再接触内容源。
 */
import { type ContentIrEntry, contentIr } from '@/content/ir';
import type { ContentTrack, ContentType, Difficulty } from '@/content/schema/docs';
import type { Locale } from '@/lib/i18n';

export interface ContentManifestEntry {
  // Identity vs location, deliberately separate: `id` is the stable logical
  // identity shared across locales; `url` / `slugs` describe where the page
  // currently lives and may change; `locale` selects the language variant.
  // 身份与位置刻意分离：`id` 是跨语言共享的稳定逻辑身份；`url` / `slugs`
  // 描述页面当前所在位置、可以变化；`locale` 选择语言版本。
  id: string;
  locale: Locale;
  url: string;
  title: string;
  description?: string;
  slugs: string[];
  draft?: boolean;
  // Content Schema v2 — optional knowledge-system metadata, passed through
  // from frontmatter so consumers (search, /learn, knowledge graph) never
  // re-parse disk content. See docs/adr/0002 for the field decisions.
  // Content Schema v2 —— 可选知识体系元数据，自 frontmatter 透传，
  // 搜索、/learn、知识图谱等消费方无需重复解析磁盘内容。
  // 字段取舍见 docs/adr/0002。
  type?: ContentType;
  topics?: string[];
  track?: ContentTrack[];
  difficulty?: Difficulty;
  estimatedMinutes?: number;
  prerequisites?: string[];
  related?: string[];
}

export function createManifestEntry(entry: ContentIrEntry): ContentManifestEntry {
  return {
    id: entry.id,
    locale: entry.locale,
    url: entry.url,
    title: entry.title,
    ...(entry.description !== undefined ? { description: entry.description } : {}),
    slugs: [...entry.slugs],
    ...(entry.draft === true ? { draft: true } : {}),
    ...(entry.type !== undefined ? { type: entry.type } : {}),
    ...(entry.topics !== undefined ? { topics: entry.topics } : {}),
    ...(entry.track !== undefined ? { track: entry.track } : {}),
    ...(entry.difficulty !== undefined ? { difficulty: entry.difficulty } : {}),
    ...(entry.estimatedMinutes !== undefined ? { estimatedMinutes: entry.estimatedMinutes } : {}),
    ...(entry.prerequisites !== undefined ? { prerequisites: entry.prerequisites } : {}),
    ...(entry.related !== undefined ? { related: entry.related } : {}),
  };
}

export const contentManifest = Object.freeze(
  contentIr.map((entry) => createManifestEntry(entry)),
) satisfies readonly ContentManifestEntry[];

const entriesByIdentity = new Map(
  contentManifest.map((entry) => [`${entry.id}:${entry.locale}`, entry] as const),
);

export function getContentManifestEntry(
  id: string,
  locale: Locale,
): ContentManifestEntry | undefined {
  return entriesByIdentity.get(`${id}:${locale}`);
}

export function getContentLanguagePaths(id: string): Partial<Record<Locale, string>> {
  const paths: Partial<Record<Locale, string>> = {};
  for (const entry of contentManifest) {
    if (entry.id === id) paths[entry.locale] = entry.url;
  }
  return paths;
}
