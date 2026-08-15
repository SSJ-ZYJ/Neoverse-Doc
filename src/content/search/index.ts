// Search index construction belongs to the content layer; the route only exports it.
// Search intentionally builds from the Fumadocs source instead of the Content
// IR: indexes need tokenized structuredData, which would turn the IR into a
// giant body dump — the one content consumer allowed beside the IR pipeline
// (see docs/adr/0004). Index generation stays build-time; Search UI stays a
// separate client consumer.
// 搜索索引构建属于内容层，路由仅负责导出。
// 搜索有意直接基于 Fumadocs 内容源而非 Content IR：索引需要 token 化的
// structuredData，塞进 IR 会把它变成巨型正文转储 —— 因此是 IR 管线之外
// 唯一被允许的内容消费方（见 docs/adr/0004）。索引生成保持在构建期，
// Search UI 保持为独立的客户端消费方。
import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/adapters/fumadocs/source';
import { i18n, type Locale } from '@/lib/i18n';
import { createContentId } from '../ir';
import { getSearchMetadataTags } from './facets';
import { getSearchPageMetadata } from './metadata';
import { createSearchCorpus, toFumadocsSearchIndexInput } from './schema';
import { createMixedTokenizer, markPinyinIndexContent } from './tokenizer';

export type { SearchRankingContext, SearchTaxonomyFilters } from './facets';
export { createSearchFilterTags, getSearchMetadataTags } from './facets';
export { getSearchPageMetadata, searchMetadataSidecar } from './metadata';
export type {
  SearchDocument,
  SearchDocumentInput,
  SearchDocumentRecordKind,
  SearchStructuredData,
} from './schema';
export {
  createSearchCorpus,
  toFumadocsSearchIndexInput,
} from './schema';

function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (i18n.languages as readonly string[]).includes(value);
}

export const { staticGET: staticSearchGET } = createFromSource(source, {
  buildIndex(page) {
    if (!isLocale(page.locale)) {
      throw new Error('Search source page is missing a configured locale.');
    }
    const locale = page.locale;
    const contentId = createContentId(page.data.id);
    const metadata = getSearchPageMetadata(contentId, locale);
    if (metadata === undefined) {
      throw new Error(`Search metadata is missing for structured content ${contentId}:${locale}.`);
    }
    const corpus = createSearchCorpus(
      {
        contentId,
        locale,
        url: page.url,
        title: page.data.title,
        description: page.data.description,
        structuredData: page.data.structuredData,
      },
      metadata,
    );
    const indexInput = toFumadocsSearchIndexInput(corpus);
    const pinyinEnabled = locale === 'zh';
    const structuredData = pinyinEnabled
      ? {
          ...indexInput.structuredData,
          headings: indexInput.structuredData.headings.map((heading) => ({
            ...heading,
            content: markPinyinIndexContent(heading.content),
          })),
        }
      : indexInput.structuredData;

    return {
      // The pure corpus is joined by Content ID before it is lowered to
      // Fumadocs' fixed index shape. Tags carry the metadata dimensions that
      // the mature static engine can filter without a custom schema.
      // 纯语料先按 Content ID 完成 join，再降级为 Fumadocs 固定索引形状。
      // tag 携带现有静态引擎可直接过滤的元数据维度，无需自定义 Schema。
      ...indexInput,
      title: pinyinEnabled ? markPinyinIndexContent(indexInput.title) : indexInput.title,
      structuredData,
      tag: getSearchMetadataTags(metadata),
    };
  },
  localeMap: {
    zh: {
      language: '',
      components: { tokenizer: createMixedTokenizer() },
      search: { threshold: 0, tolerance: 0 },
    },
    en: { language: 'english' },
  },
});
