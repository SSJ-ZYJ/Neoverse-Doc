/**
 * Shiki transformer: copies `title` from parsed meta and `lang` to `<pre>` element properties
 * so that the CodeBlock component receives them as props.
 *
 * Shiki transformer：将解析后的 meta.title 和语言信息复制到 <pre> 元素的 properties 上，
 * 使 CodeBlock 组件能通过 props 接收文件路径和编程语言。
 */
export function transformerMetaTitle() {
  return {
    name: 'rehype-code:meta-title',
    pre(
      this: { options?: { meta?: { title?: unknown }; lang?: string } },
      pre: { properties?: Record<string, unknown> },
    ) {
      const title = this.options?.meta?.title;
      const lang = this.options?.lang;
      if (typeof title === 'string') {
        pre.properties ??= {};
        pre.properties.title = title;
      }
      if (typeof lang === 'string') {
        pre.properties ??= {};
        pre.properties.lang = lang;
      }
      return pre;
    },
  };
}
