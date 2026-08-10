// Custom tokenizer for mixed Chinese/English content and namespaced Pinyin aliases.
// The aliases are indexed only for explicitly selected Chinese titles and headings.
// 自定义中英文混合分词器，并为显式选中的中文标题与小节标题生成带命名空间的拼音别名。

import type { DefaultTokenizer } from '@orama/orama';
import { createTokenizer } from '@orama/tokenizers/mandarin';
import { pinyin } from 'pinyin-pro';

const PINYIN_QUERY_PREFIX = '\u0000pinyin:';
const PINYIN_INDEX_PREFIX = '\uE000';
const PINYIN_TOKEN_PREFIX = 'neoversepinyin';
const MAX_PINYIN_SEGMENT_SPAN = 8;
const HAN_PATTERN = /\p{Script=Han}/u;
const PINYIN_QUERY_PATTERN = /^[a-zA-Z\s-]+$/;

/**
 * Normalize token for case-insensitive search.
 * English tokens are lowercased, Chinese tokens are kept as-is.
 *
 * 规范化 token 以实现大小写不敏感搜索。
 * 英文 token 转换为小写，中文 token 保持不变。
 */
function normalizeTokenCase(token: string): string {
  return /[a-zA-Z]/.test(token) ? token.toLowerCase() : token;
}

function namespacePinyinToken(token: string): string {
  return `${PINYIN_TOKEN_PREFIX}${token}`;
}

function addKeyboardUmlautVariant(tokens: Set<string>, token: string): void {
  tokens.add(token);
  if (token.includes('v')) tokens.add(token.replaceAll('v', 'u'));
}

function getPinyinAliases(input: string, baseTokens: string[]): string[] {
  const aliases = new Set<string>();
  const chineseSegments = baseTokens.filter((token) => HAN_PATTERN.test(token));
  const candidates = new Set([input, ...chineseSegments]);

  // Add bounded adjacent spans so a continuous query can match a phrase inside
  // a numbered heading, without producing unbounded aliases for long content.
  // 添加有界相邻片段，使连续全拼能匹配带编号标题中的短语，
  // 同时避免为长内容生成无界数量的别名。
  for (let start = 0; start < chineseSegments.length; start++) {
    const endLimit = Math.min(chineseSegments.length, start + MAX_PINYIN_SEGMENT_SPAN);
    for (let end = start + 2; end <= endLimit; end++) {
      candidates.add(chineseSegments.slice(start, end).join(''));
    }
  }

  for (const segment of candidates) {
    if (!HAN_PATTERN.test(segment)) continue;

    const syllables = pinyin(segment, {
      removeNonZh: true,
      toneType: 'none',
      type: 'array',
      v: true,
    });
    if (syllables.length === 0) continue;

    for (const syllable of syllables) addKeyboardUmlautVariant(aliases, syllable);
    addKeyboardUmlautVariant(aliases, syllables.join(''));

    if (syllables.length >= 2) {
      addKeyboardUmlautVariant(aliases, syllables.map((syllable) => syllable[0]).join(''));
    }
  }

  return Array.from(aliases, namespacePinyinToken);
}

function tokenizePinyinQuery(raw: string): string[] {
  const query = raw.slice(PINYIN_QUERY_PREFIX.length).trim().toLowerCase();
  if (!PINYIN_QUERY_PATTERN.test(query)) return [];

  return query
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(namespacePinyinToken);
}

/**
 * Wrap a user query so the tokenizer searches only the namespaced Pinyin aliases.
 * Returns undefined for unsupported input and one-letter queries.
 *
 * 包装用户查询，使分词器仅搜索带命名空间的拼音别名。
 * 不支持的输入和单字母查询返回 undefined。
 */
export function createPinyinSearchQuery(query: string): string | undefined {
  const normalized = query.trim();
  if (!PINYIN_QUERY_PATTERN.test(normalized)) return;

  const letterCount = normalized.replace(/[^a-zA-Z]/g, '').length;
  if (letterCount < 2) return;

  return `${PINYIN_QUERY_PREFIX}${normalized}`;
}

export function markPinyinIndexContent(content: string): string {
  return `${PINYIN_INDEX_PREFIX}${content}`;
}

export function unmarkPinyinIndexContent(content: string): string {
  return content.startsWith(PINYIN_INDEX_PREFIX)
    ? content.slice(PINYIN_INDEX_PREFIX.length)
    : content;
}

/**
 * Create the mixed tokenizer used by both the static index and browser search.
 * The server marks only titles and headings so they receive Pinyin aliases;
 * the browser uses the same alias format to query the exported database.
 *
 * 创建静态索引与浏览器搜索共用的混合分词器。
 * 服务端仅标记标题和小节标题，使其生成拼音别名；
 * 浏览器使用相同别名格式查询导出的数据库。
 */
export function createMixedTokenizer(): DefaultTokenizer {
  const baseTokenizer = createTokenizer();
  const originalNormalizeToken = baseTokenizer.normalizeToken;
  const originalTokenize = baseTokenizer.tokenize;

  baseTokenizer.normalizeToken = function (
    this: DefaultTokenizer,
    prop: string,
    token: string,
    withCache?: boolean,
  ): string {
    const normalized = originalNormalizeToken.call(this, prop, token, withCache);
    return normalized ? normalizeTokenCase(normalized) : normalized;
  };

  baseTokenizer.tokenize = function (
    this: DefaultTokenizer,
    input: string,
    language?: string,
    prop?: string,
  ): string[] {
    if (input.startsWith(PINYIN_QUERY_PREFIX)) return tokenizePinyinQuery(input);

    const shouldIndexPinyin = input.startsWith(PINYIN_INDEX_PREFIX);
    const content = unmarkPinyinIndexContent(input);
    const tokens = originalTokenize
      .call(this, content, language, prop)
      .map((token) => normalizeTokenCase(token));

    if (!shouldIndexPinyin || !HAN_PATTERN.test(content)) return tokens;

    return Array.from(new Set([...tokens, ...getPinyinAliases(content, tokens)]));
  };

  return baseTokenizer;
}
