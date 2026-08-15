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
import { createContentId } from '../ir';
import { createMixedTokenizer, markPinyinIndexContent } from './tokenizer';

export const { staticGET: staticSearchGET } = createFromSource(source, {
  buildIndex(page) {
    const pinyinEnabled = page.locale === 'zh';
    const structuredData = pinyinEnabled
      ? {
          ...page.data.structuredData,
          headings: page.data.structuredData.headings.map((heading) => ({
            ...heading,
            content: markPinyinIndexContent(heading.content),
          })),
        }
      : page.data.structuredData;

    return {
      // Record identity is the stable Content ID plus locale (keeps zh/en
      // variants distinct); navigation still goes through `url`. The client
      // only uses `id` for dedup, so switching it away from the URL is safe
      // and keeps search records stable across URL adjustments (ADR 0003).
      // 记录身份使用稳定 Content ID 加 locale（区分中英文版本）；导航仍走
      // `url`。客户端仅用 `id` 去重，因此从 URL 切换过来是安全的，且让搜索
      // 记录在 URL 调整后保持稳定（ADR 0003）。
      id: `${createContentId(page.data.id)}:${page.locale}`,
      title: pinyinEnabled ? markPinyinIndexContent(page.data.title) : page.data.title,
      description: page.data.description,
      url: page.url,
      structuredData,
      tag: page.slugs[0],
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
