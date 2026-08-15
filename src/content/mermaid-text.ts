/**
 * Pure fenced-block extractor for Mermaid diagram sources in MDX / Markdown
 * text. Belongs to the content layer so the Content IR can detect diagrams
 * while normalizing pages — build steps must not re-walk the content tree
 * with private parsers. Normalization delegates to the shared mermaid-id
 * helpers so extracted sources hash identically on build and client sides.
 *
 * 从 MDX / Markdown 文本提取 Mermaid 图表源码的纯函数栅栏扫描器。归属内容层，
 * 使 Content IR 在规范化页面时即可检测图表 —— 构建步骤不得再各自实现私有
 * 扫描器重复理解内容。规范化委托给共享的 mermaid-id 工具，确保提取出的源码
 * 在构建端与客户端哈希一致。
 */
import { normalizeMermaidSource } from '@/lib/mermaid-id';

function isClosingFence(line: string, marker: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < marker.length) return false;
  return [...trimmed].every((character) => character === marker[0]);
}

export function extractMermaidBlocks(markdown: string): string[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const opening = lines[index]?.match(/^ {0,3}(`{3,}|~{3,})[ \t]*mermaid(?:[ \t]+.*)?$/);
    if (!opening) continue;

    const marker = opening[1];
    const body: string[] = [];
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      if (isClosingFence(line, marker)) break;
      body.push(line);
    }

    const source = normalizeMermaidSource(body.join('\n'));
    if (source) blocks.push(source);
  }

  return blocks;
}
