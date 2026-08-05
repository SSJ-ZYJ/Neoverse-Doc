/**
 * Shiki transformer: copies `title` from parsed meta and `lang` to `<pre>` element properties
 * so that the CodeBlock component receives them as props.
 *
 * If the meta string contains `originalLang=<name>` (set by `remark-lang-alias`),
 * the original language name is restored for display, while Shiki still highlights
 * using the aliased bundled grammar.
 *
 * Shiki transformer：将解析后的 meta.title 和语言信息复制到 <pre> 元素的 properties 上，
 * 使 CodeBlock 组件能通过 props 接收文件路径和编程语言。
 *
 * 若 meta 字符串包含 `originalLang=<name>`（由 `remark-lang-alias` 设置），
 * 则恢复原始语言名用于显示，而 Shiki 仍使用别名内置语法进行高亮。
 */
export function transformerMetaTitle() {
  return {
    name: 'rehype-code:meta-title',
    pre(
      this: { options?: { meta?: { title?: unknown; __raw?: string }; lang?: string } },
      pre: { properties?: Record<string, unknown> },
    ) {
      const title = this.options?.meta?.title;
      const raw = this.options?.meta?.__raw;
      const lang = this.options?.lang;
      if (typeof title === 'string') {
        pre.properties ??= {};
        pre.properties.title = title;
      }
      if (typeof lang === 'string') {
        pre.properties ??= {};
        // Restore original language from meta (e.g., "originalLang=gitattributes")
        // 从 meta 中恢复原始语言名（例如 "originalLang=gitattributes"）
        const match = typeof raw === 'string' ? raw.match(/originalLang=(\S+)/) : null;
        pre.properties.lang = match ? match[1] : lang;
      }
      return pre;
    },
  };
}
