import type { SearchMetadataProjectionEntry } from '@/content/projections';
import type { ContentTopic, ContentTrack, ContentType, Difficulty } from '@/content/taxonomy';
import type { Locale } from '@/lib/i18n';

export interface SearchStructuredData {
  readonly headings: readonly {
    readonly id: string;
    readonly content: string;
  }[];
  readonly contents: readonly {
    readonly heading: string | undefined;
    readonly content: string;
  }[];
}

export type SearchDocumentRecordKind = 'page' | 'description' | 'heading' | 'body';

/**
 * The product-level search record. recordKind intentionally differs from the
 * taxonomy's contentType: Fumadocs uses its own page/heading/text type
 * internally, while this schema carries the content model's type separately.
 *
 * 面向产品的搜索记录。recordKind 刻意不同于 taxonomy 的 contentType：
 * Fumadocs 内部使用自己的 page/heading/text 类型，而本 Schema 单独携带
 * Content Model 的类型。
 */
export interface SearchDocument {
  readonly id: string;
  readonly recordKind: SearchDocumentRecordKind;
  readonly contentId: string;
  readonly locale: Locale;
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly headingId?: string;
  readonly headingTitle?: string;
  readonly body: string;
  readonly contentType?: ContentType;
  readonly topics?: readonly ContentTopic[];
  readonly tracks?: readonly ContentTrack[];
  readonly difficulty?: Difficulty;
}

export interface SearchDocumentInput {
  readonly contentId: string;
  readonly locale: Locale;
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly structuredData: SearchStructuredData;
}

export interface SearchCorpus {
  readonly metadata: SearchMetadataProjectionEntry;
  readonly documents: readonly SearchDocument[];
}

export interface FumadocsSearchIndexInput {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly url: string;
  readonly structuredData: {
    headings: {
      id: string;
      content: string;
    }[];
    contents: {
      heading: string | undefined;
      content: string;
    }[];
  };
}

function taxonomyFields(
  metadata: SearchMetadataProjectionEntry,
): Pick<SearchDocument, 'contentType' | 'topics' | 'tracks' | 'difficulty'> {
  return {
    ...(metadata.contentType !== undefined ? { contentType: metadata.contentType } : {}),
    ...(metadata.topics !== undefined ? { topics: [...metadata.topics] } : {}),
    ...(metadata.tracks !== undefined ? { tracks: [...metadata.tracks] } : {}),
    ...(metadata.difficulty !== undefined ? { difficulty: metadata.difficulty } : {}),
  };
}

function requirePageDocument(documents: readonly SearchDocument[]): SearchDocument {
  const pageDocument = documents.find((document) => document.recordKind === 'page');
  if (pageDocument === undefined) throw new Error('Search corpus is missing its page document.');
  return pageDocument;
}

function requireHeadingId(document: SearchDocument): string {
  if (document.headingId === undefined) {
    throw new Error('Search heading document is missing its heading ID.');
  }
  return document.headingId;
}

/**
 * Joins structured body data with Manifest-derived metadata at build time.
 * The complete body stays inside the Search corpus; it never enters Content
 * IR. Each granular record carries the page's stable identity and taxonomy
 * dimensions for future result enrichment without changing Fumadocs' engine.
 *
 * 在构建期将结构化正文与 Manifest 派生的元数据连接。完整正文只保留在
 * Search 语料中，绝不进入 Content IR。每条细粒度记录都带有页面稳定身份
 * 和 taxonomy 维度，未来可丰富结果而无需替换 Fumadocs 搜索引擎。
 */
export function createSearchCorpus(
  input: SearchDocumentInput,
  metadata: SearchMetadataProjectionEntry,
): SearchCorpus {
  const searchPageId = `${input.contentId}:${input.locale}`;
  if (
    metadata.searchPageId !== searchPageId ||
    metadata.contentId !== input.contentId ||
    metadata.locale !== input.locale
  ) {
    throw new Error('Search metadata does not match the structured content identity.');
  }

  const shared = {
    contentId: input.contentId,
    locale: input.locale,
    url: input.url,
    title: input.title,
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...taxonomyFields(metadata),
  };
  const headingTitles = new Map(
    input.structuredData.headings.map((heading) => [heading.id, heading.content] as const),
  );
  const documents: SearchDocument[] = [
    {
      id: searchPageId,
      recordKind: 'page',
      ...shared,
      body: input.title,
    },
  ];
  let sequence = 0;
  const nextId = () => `${searchPageId}-${sequence++}`;

  if (input.description !== undefined) {
    documents.push({
      id: nextId(),
      recordKind: 'description',
      ...shared,
      body: input.description,
    });
  }

  for (const heading of input.structuredData.headings) {
    documents.push({
      id: nextId(),
      recordKind: 'heading',
      ...shared,
      headingId: heading.id,
      headingTitle: heading.content,
      body: heading.content,
    });
  }

  for (const content of input.structuredData.contents) {
    documents.push({
      id: nextId(),
      recordKind: 'body',
      ...shared,
      ...(content.heading !== undefined ? { headingId: content.heading } : {}),
      ...(content.heading !== undefined && headingTitles.has(content.heading)
        ? { headingTitle: headingTitles.get(content.heading) }
        : {}),
      body: content.content,
    });
  }

  return { metadata, documents };
}

/**
 * Converts the pure corpus model back into Fumadocs' supported index shape.
 * This keeps the mature full-text engine responsible for indexing and result
 * grouping, instead of duplicating it in the product layer.
 *
 * 将纯语料模型转换回 Fumadocs 支持的索引形状。成熟全文引擎仍负责建索引和
 * 结果分组，产品层不会重复实现它。
 */
export function toFumadocsSearchIndexInput(corpus: SearchCorpus): FumadocsSearchIndexInput {
  const pageDocument = requirePageDocument(corpus.documents);
  const descriptionDocument = corpus.documents.find(
    (document) => document.recordKind === 'description',
  );

  return {
    id: pageDocument.id,
    title: pageDocument.title,
    ...(descriptionDocument !== undefined ? { description: descriptionDocument.body } : {}),
    url: pageDocument.url,
    structuredData: {
      headings: corpus.documents
        .filter((document) => document.recordKind === 'heading')
        .map((document) => ({
          id: requireHeadingId(document),
          content: document.body,
        })),
      contents: corpus.documents
        .filter((document) => document.recordKind === 'body')
        .map((document) => ({
          heading: document.headingId,
          content: document.body,
        })),
    },
  };
}
