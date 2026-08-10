import type { SortedResult } from 'fumadocs-core/search';

export const SEARCH_SPOTLIGHT_PARAM = '_searchSpotlight';

const MARK_PATTERN = /<mark>([\s\S]*?)<\/mark>/giu;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const MARKDOWN_DECORATION_PATTERN = /[`*_~#]/g;
const MAX_SPOTLIGHT_TEXT_LENGTH = 120;

function cleanSpotlightText(content: string): string {
  return content
    .replace(HTML_TAG_PATTERN, '')
    .replace(MARKDOWN_DECORATION_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SPOTLIGHT_TEXT_LENGTH);
}

function getMarkedText(content: string): string | undefined {
  const match = MARK_PATTERN.exec(content);
  MARK_PATTERN.lastIndex = 0;
  if (!match) return;

  const text = cleanSpotlightText(match[1]);
  return text || undefined;
}

function getResultGroupTarget(
  results: SortedResult[],
  index: number,
  query: string,
): string | undefined {
  const result = results[index];
  const ownMarkedText = getMarkedText(result.content);
  if (ownMarkedText) return ownMarkedText;

  if (result.type === 'page') {
    for (let childIndex = index + 1; childIndex < results.length; childIndex++) {
      const child = results[childIndex];
      if (child.type === 'page') break;
      if (child.url !== result.url) continue;

      const childTarget = getMarkedText(child.content) ?? cleanSpotlightText(child.content);
      if (childTarget) return childTarget;
    }
  }

  if (result.type === 'text') return cleanSpotlightText(query) || undefined;
  return cleanSpotlightText(result.content) || undefined;
}

function addSpotlightParam(url: string, target: string): string {
  const parsed = new URL(url, 'https://neoverse.local');
  parsed.searchParams.set(SEARCH_SPOTLIGHT_PARAM, target);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function addSearchSpotlightParams(results: SortedResult[], query: string): SortedResult[] {
  return results.map((result, index) => {
    const target = getResultGroupTarget(results, index, query);
    return target ? { ...result, url: addSpotlightParam(result.url, target) } : result;
  });
}
