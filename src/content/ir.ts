/**
 * Content IR — the single normalized content data plane, derived in one pass
 * from the Fumadocs source (which stays the only MDX compiler). Every build
 * step that needs page metadata (manifest, content validation, mermaid
 * pipeline) consumes this module instead of re-walking content/docs with its
 * own scanner. The data is 100% machine-derived at import time — never
 * hand-maintained and never materialized to a file, so it can never go stale
 * against the sources it was derived from (see docs/adr/0004).
 *
 * Content IR —— 唯一的规范化内容数据面，从 Fumadocs 内容源单遍派生
 * （Fumadocs 仍是唯一的 MDX 编译器）。所有需要页面元数据的构建步骤
 * （manifest、内容校验、Mermaid 管线）都消费本模块，而不是各自用私有
 * 扫描器重复理解 content/docs。数据在导入时 100% 机器派生 —— 永不手工
 * 维护、永不物化为文件，因此不可能相对其派生源头变得陈旧
 * （见 docs/adr/0004）。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { source } from '@/adapters/fumadocs/source';
import type { ContentTrack, ContentType, Difficulty } from '@/content/schema/docs';
import { i18n, type Locale } from '@/lib/i18n';
import { extractMermaidBlocks } from './mermaid-text';

// Derives the full Content ID from the stable frontmatter id. The identity is
// owned by frontmatter, not by path — file moves, URL adjustments and title
// edits never change it (see docs/adr/0003).
// 由稳定 frontmatter id 派生完整 Content ID。身份归属 frontmatter 而非路径
// —— 文件移动、URL 调整与标题修改都不会改变它（见 docs/adr/0003）。
export function createContentId(id: string): string {
  return `docs:${id}`;
}

export interface ContentIrEntry {
  // Identity vs location, deliberately separate: `id` is the stable logical
  // identity shared across locales; `url` / `slugs` / `sourcePath` describe
  // where the page currently lives and may change; `locale` selects the
  // language variant. `mermaid` lists the normalized diagram sources found in
  // the page so downstream steps never re-parse the MDX.
  // 身份与位置刻意分离：`id` 是跨语言共享的稳定逻辑身份；`url` / `slugs` /
  // `sourcePath` 描述页面当前所在位置、可以变化；`locale` 选择语言版本。
  // `mermaid` 列出页面中规范化后的图表源码，下游步骤无需再解析 MDX。
  id: string;
  locale: Locale;
  url: string;
  title: string;
  description?: string;
  slugs: string[];
  sourcePath: string;
  draft?: boolean;
  type?: ContentType;
  topics?: string[];
  track?: ContentTrack[];
  difficulty?: Difficulty;
  estimatedMinutes?: number;
  prerequisites?: string[];
  related?: string[];
  mermaid: string[];
}

type IrPage = {
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
    info: { fullPath: string };
  };
  locale?: string;
  slugs: string[];
  url: string;
};

// Copy only the v2 fields a page actually declares, keeping entries free of
// undefined noise (same convention as description / draft below).
// 仅复制页面实际声明的 v2 字段，条目不携带 undefined 噪声
// （与上方 description / draft 的处理约定一致）。
function pickV2Fields(data: IrPage['data']): Partial<ContentIrEntry> {
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

export function createContentIrEntry(page: IrPage, locale: Locale): ContentIrEntry {
  // Synchronous reads keep the IR derivable at module scope; this only ever
  // runs in build-time processes (Next build, Bun pipeline, tests).
  // 同步读取使 IR 可在模块作用域派生；仅运行于构建期进程
  // （Next build、Bun 管线、测试）。
  const raw = readFileSync(page.data.info.fullPath, 'utf8');

  return {
    id: createContentId(page.data.id),
    locale,
    url: page.url,
    title: page.data.title,
    ...(page.data.description ? { description: page.data.description } : {}),
    slugs: [...page.slugs],
    sourcePath: path.relative(process.cwd(), page.data.info.fullPath).split(path.sep).join('/'),
    ...(page.data.draft === true ? { draft: true } : {}),
    ...pickV2Fields(page.data),
    mermaid: extractMermaidBlocks(raw),
  };
}

export const contentIr = Object.freeze(
  i18n.languages.flatMap((locale) =>
    source.getPages(locale).map((page) => createContentIrEntry(page, locale)),
  ),
) satisfies readonly ContentIrEntry[];

export function countMermaidDiagrams(ir: readonly ContentIrEntry[]): number {
  return ir.reduce((sum, entry) => sum + entry.mermaid.length, 0);
}
