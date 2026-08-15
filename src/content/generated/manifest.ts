import { source } from '@/adapters/fumadocs/source';
import type { ContentTrack, ContentType, Difficulty } from '@/content/schema/docs';
import { i18n, type Locale } from '@/lib/i18n';

export interface ContentManifestEntry {
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

export function createContentId(slugs: readonly string[]): string {
  return `docs:${slugs.join('/')}`;
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
    id: createContentId(page.slugs),
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
