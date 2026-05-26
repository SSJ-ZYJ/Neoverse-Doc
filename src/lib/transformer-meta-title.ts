/**
 * Shiki transformer: copies `title` from parsed meta to `<pre>` element properties
 * so that the CodeBlock component receives it as a `title` prop.
 *
 * Shiki transformer：将解析后的 meta.title 复制到 <pre> 元素的 properties 上，
 * 使 CodeBlock 组件能通过 title prop 接收文件路径。
 */
export function transformerMetaTitle() {
  return {
    name: 'rehype-code:meta-title',
    pre(
      this: { options?: { meta?: { title?: unknown } } },
      pre: { properties?: Record<string, unknown> },
    ) {
      const title = this.options?.meta?.title;
      if (typeof title === 'string') {
        pre.properties ??= {};
        pre.properties.title = title;
      }
      return pre;
    },
  };
}
