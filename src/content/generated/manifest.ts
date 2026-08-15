import { source } from '@/adapters/fumadocs/source';
import type { ContentTrack, ContentType, Difficulty } from '@/content/schema/docs';
import { i18n, type Locale } from '@/lib/i18n';

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

type ManifestPage = {
  data: {
    id: string;
    title: string;
    description?: string;
    draft?: boolean;
    type?: ContentType;
    topics?: string[];
    track?: ContentTrack[];
    difficulty?: Difficulty;
    estimatedMinutes?: number;
    prerequisites?: string[];
    related?: string[];
  };
  locale?: string;
  slugs: string[];
  url: string;
};

// Derives the full Content ID from the stable frontmatter id. The identity is
// owned by frontmatter, not by path — file moves, URL adjustments and title
// edits never change it (see docs/adr/0003).
// 由稳定 frontmatter id 派生完整 Content ID。身份归属 frontmatter 而非路径
// —— 文件移动、URL 调整与标题修改都不会改变它（见 docs/adr/0003）。
export function createContentId(id: string): string {
  return `docs:${id}`;
}

// Copy only the v2 fields a page actually declares, keeping entries free of
// undefined noise (same convention as description / draft above).
// 仅复制页面实际声明的 v2 字段，条目不携带 undefined 噪声
// （与上方 description / draft 的处理约定一致）。
function pickV2Fields(data: ManifestPage['data']): Partial<ContentManifestEntry> {
  return {
    ...(data.type !== undefined ? { type: data.type } : {}),
    ...(data.topics !== undefined ? { topics: data.topics } : {}),
    ...(data.track !== undefined ? { track: data.track } : {}),
    ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
    ...(data.estimatedMinutes !== undefined ? { estimatedMinutes: data.estimatedMinutes } : {}),
    ...(data.prerequisites !== undefined ? { prerequisites: data.prerequisites } : {}),
    ...(data.related !== undefined ? { related: data.related } : {}),
  };
}

export function createContentManifestEntry(
  page: ManifestPage,
  locale: Locale,
): ContentManifestEntry {
  return {
    id: createContentId(page.data.id),
    locale,
    url: page.url,
    title: page.data.title,
    ...(page.data.description ? { description: page.data.description } : {}),
    slugs: [...page.slugs],
    ...(page.data.draft === true ? { draft: true } : {}),
    ...pickV2Fields(page.data),
  };
}

export const contentManifest = Object.freeze(
  i18n.languages.flatMap((locale) =>
    source.getPages(locale).map((page) => createContentManifestEntry(page, locale)),
  ),
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
