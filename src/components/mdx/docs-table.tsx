import type { ComponentProps } from 'react';

/** Own the scroll boundary while preserving native table semantics and props.
 * 仅拥有滚动边界，保留原生表格语义与属性。 */
export function DocsTable(props: ComponentProps<'table'>) {
  return (
    <div
      className="docs-table-scroll ui-surface ui-surface-subtle prose-no-margin my-6"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: horizontal scrolling must be keyboard accessible
      tabIndex={0}
    >
      <table {...props} />
    </div>
  );
}
