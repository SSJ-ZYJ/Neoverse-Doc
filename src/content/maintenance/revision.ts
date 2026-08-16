import { createHash } from 'node:crypto';
import type { ContentTopic, ContentTrack, ContentType, Difficulty } from '@/content/taxonomy';

/**
 * Reader-facing source metadata included in a revision. Maintenance fields
 * such as lifecycle and review dates are intentionally excluded: confirming a
 * page on a new date must not make every translation drift again.
 * 参与内容 revision 的是读者可感知元数据；生命周期、复核日期等维护字段
 * 刻意排除，避免仅更新维护信息就让所有译文重新漂移。
 */
export interface ContentRevisionMetadata {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly todoProgress?: boolean;
  readonly type?: ContentType;
  readonly topics?: readonly ContentTopic[];
  readonly tracks?: readonly ContentTrack[];
  readonly difficulty?: Difficulty;
  readonly estimatedMinutes?: number;
  readonly prerequisites?: readonly string[];
  readonly related?: readonly string[];
}

function extractMarkdownBody(raw: string): string {
  return raw
    .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

/**
 * Derive a deterministic source revision from normalized frontmatter data and
 * Markdown body. The hash is stored only as `reviewedRevision` on translations.
 * 从规范化的 frontmatter 数据与 Markdown 正文派生确定性 source revision；
 * 该 hash 只由译文以 `reviewedRevision` 保存。
 */
export function createContentRevision(metadata: ContentRevisionMetadata, raw: string): string {
  const payload = JSON.stringify({ metadata, body: extractMarkdownBody(raw) });
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}
