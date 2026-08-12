import type { SortedResult } from 'fumadocs-core/search';
import type { SearchClient } from 'fumadocs-core/search/client';
import { createPinyinSearchQuery, unmarkPinyinIndexContent } from '@/content/search/tokenizer';
import { addSearchSpotlightParams } from './spotlight';

const MAX_RESULTS = 60;

export function cleanSearchResultContent(results: SortedResult[]): SortedResult[] {
  return results.map((result) => ({
    ...result,
    content: unmarkPinyinIndexContent(result.content),
  }));
}

const RESULT_TYPE_PRIORITY: Record<SortedResult['type'], number> = {
  page: 0,
  heading: 1,
  text: 2,
};

interface SearchResultGroup {
  index: number;
  priority: number;
  results: SortedResult[];
}

function hasHighlight(result: SortedResult): boolean {
  return result.content.includes('<mark>');
}

function getGroupPriority(results: SortedResult[]): number {
  const page = results.find((result) => result.type === 'page');
  if (page && hasHighlight(page)) return 0;
  if (results.some((result) => result.type === 'heading')) return 1;
  return 2;
}

export function rankSearchResultGroups(results: SortedResult[]): SortedResult[] {
  const groups: SearchResultGroup[] = [];
  let group: Array<{ index: number; result: SortedResult }> = [];

  const flushGroup = () => {
    if (group.length === 0) return;
    group.sort(
      (left, right) =>
        RESULT_TYPE_PRIORITY[left.result.type] - RESULT_TYPE_PRIORITY[right.result.type] ||
        left.index - right.index,
    );
    const groupResults = group.map(({ result }) => result);
    groups.push({
      index: groups.length,
      priority: getGroupPriority(groupResults),
      results: groupResults,
    });
    group = [];
  };

  for (const result of results) {
    if (result.type === 'page' && group.length > 0) flushGroup();
    group.push({ index: group.length, result });
  }
  flushGroup();

  groups.sort((left, right) => left.priority - right.priority || left.index - right.index);
  return groups.flatMap(({ results: groupResults }) => groupResults);
}

export function preferSearchResultAnchors(results: SortedResult[]): SortedResult[] {
  return results.map((result, index) => {
    if (result.type !== 'page') return result;
    if (hasHighlight(result)) return result;

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
        return addSearchSpotlightParams(
          preferSearchResultAnchors(
            rankSearchResultGroups(cleanSearchResultContent(await client.search(query))),
          ),
          query,
        );
      }

      const [literalResults, pinyinResults] = await Promise.all([
        client.search(query),
        client.search(pinyinQuery),
      ]);

      return addSearchSpotlightParams(
        mergePinyinSearchResults(
          preferSearchResultAnchors(
            rankSearchResultGroups(cleanSearchResultContent(literalResults)),
          ),
          preferSearchResultAnchors(
            rankSearchResultGroups(cleanSearchResultContent(pinyinResults)),
          ),
        ),
        query,
      );
    },
  };
}
