import type { SortedResult } from 'fumadocs-core/search';
import type { SearchClient } from 'fumadocs-core/search/client';
import { createPinyinSearchQuery, unmarkPinyinIndexContent } from '@/lib/search-tokenizer';

const MAX_RESULTS = 60;

export function cleanSearchResultContent(results: SortedResult[]): SortedResult[] {
  return results.map((result) => ({
    ...result,
    content: unmarkPinyinIndexContent(result.content),
  }));
}

export function preferSearchResultAnchors(results: SortedResult[]): SortedResult[] {
  return results.map((result, index) => {
    if (result.type !== 'page') return result;

    const pageUrl = result.url.split('#', 1)[0];
    for (let childIndex = index + 1; childIndex < results.length; childIndex++) {
      const child = results[childIndex];
      if (child.type === 'page') break;
      if (child.url.startsWith(`${pageUrl}#`)) return { ...result, url: child.url };
    }

    return result;
  });
}

export function mergePinyinSearchResults(
  literalResults: SortedResult[],
  pinyinResults: SortedResult[],
): SortedResult[] {
  const seen = new Set(literalResults.map((result) => result.id));
  const merged = [...literalResults];

  for (const result of pinyinResults) {
    if (result.type === 'text' || seen.has(result.id)) continue;
    seen.add(result.id);
    merged.push(result);
    if (merged.length >= MAX_RESULTS) break;
  }

  return merged.slice(0, MAX_RESULTS);
}

/**
 * Point each leading page result at its best matching section. For Chinese search,
 * also append de-duplicated title and heading matches from namespaced Pinyin aliases.
 *
 * 将每组首位文章结果指向最相关的小节；中文搜索还会追加带命名空间的
 * 拼音标题与小节标题命中，并进行去重。
 */
export function withEnhancedSearch(client: SearchClient, pinyinEnabled: boolean): SearchClient {
  return {
    deps: [...(client.deps ?? []), pinyinEnabled],
    async search(query) {
      const pinyinQuery = pinyinEnabled ? createPinyinSearchQuery(query) : undefined;
      if (!pinyinQuery) {
        return preferSearchResultAnchors(cleanSearchResultContent(await client.search(query)));
      }

      const [literalResults, pinyinResults] = await Promise.all([
        client.search(query),
        client.search(pinyinQuery),
      ]);

      return mergePinyinSearchResults(
        preferSearchResultAnchors(cleanSearchResultContent(literalResults)),
        preferSearchResultAnchors(cleanSearchResultContent(pinyinResults)),
      );
    },
  };
}
