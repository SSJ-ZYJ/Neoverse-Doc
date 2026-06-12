// Custom tokenizer that supports mixed Chinese/English content with proper case-insensitive search.
// Wraps @orama/tokenizers/mandarin and adds lowercase normalization for English tokens.
// 自定义分词器，支持中英文混合内容，并正确处理英文大小写不敏感搜索。
// 包装 @orama/tokenizers/mandarin，为英文 token 添加小写规范化。

import type { DefaultTokenizer } from '@orama/orama';
import { createTokenizer } from '@orama/tokenizers/mandarin';

/**
 * Check if a token contains ASCII letters (English text).
 * 检查 token 是否包含 ASCII 字母（英文文本）。
 */
function hasEnglishLetters(token: string): boolean {
  return /[a-zA-Z]/.test(token);
}

/**
 * Normalize token for case-insensitive search.
 * English tokens are lowercased, Chinese tokens are kept as-is.
 *
 * 规范化 token 以实现大小写不敏感搜索。
 * 英文 token 转换为小写，中文 token 保持不变。
 */
function normalizeTokenCase(token: string): string {
  if (hasEnglishLetters(token)) {
    return token.toLowerCase();
  }
  return token;
}

/**
 * Create a custom tokenizer that handles mixed Chinese/English content.
 * The Mandarin tokenizer uses Intl.Segmenter for CJK word segmentation,
 * but doesn't normalize English tokens to lowercase. This wrapper adds
 * that behavior for better search experience.
 *
 * 创建一个支持中英文混合内容的自定义分词器。
 * Mandarin 分词器使用 Intl.Segmenter 进行 CJK 词分割，
 * 但不会将英文 token 规范化为小写。此包装器添加了该行为，
 * 以提供更好的搜索体验。
 */
export function createMixedTokenizer(): DefaultTokenizer {
  const baseTokenizer = createTokenizer();

  // Store the original functions
  const originalNormalizeToken = baseTokenizer.normalizeToken;
  const originalTokenize = baseTokenizer.tokenize;

  // Override normalizeToken to add lowercase normalization for English tokens
  baseTokenizer.normalizeToken = function (
    this: DefaultTokenizer,
    prop: string,
    token: string,
    withCache?: boolean,
  ): string {
    // First apply the original normalization
    let normalized = originalNormalizeToken.call(this, prop, token, withCache);

    // Then apply lowercase for English tokens
    if (normalized) {
      normalized = normalizeTokenCase(normalized);
    }

    return normalized;
  };

  // Override tokenize to ensure tokens are lowercased before indexing
  baseTokenizer.tokenize = function (
    this: DefaultTokenizer,
    input: string,
    language?: string,
    prop?: string,
  ): string[] {
    // Call the original tokenize function
    const tokens = originalTokenize.call(this, input, language, prop);

    // Normalize each token for case-insensitive search
    return tokens.map((token) => normalizeTokenCase(token));
  };

  return baseTokenizer;
}
