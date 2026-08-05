/**
 * Shiki transformer: copies `title` from parsed meta and `lang` to `<pre>` element properties
 * so that the CodeBlock component receives them as props.
 *
 * If the meta string contains `originalLang=<name>` (set by `remark-lang-alias`),
 * the original language name is restored for display, while Shiki still highlights
 * using the aliased bundled grammar. The icon is also overridden to match the
 * original language, since fumadocs' built-in `transformerIcon` runs before this
 * transformer (enforced via `enforce: "post"`) and resolves the icon from the
 * aliased lang (e.g., `ini`), missing the original lang's icon shortcut
 * (e.g., `gitattributes` → `git`).
 *
 * Shiki transformer：将解析后的 meta.title 和语言信息复制到 <pre> 元素的 properties 上，
 * 使 CodeBlock 组件能通过 props 接收文件路径和编程语言。
 *
 * 若 meta 字符串包含 `originalLang=<name>`（由 `remark-lang-alias` 设置），
 * 则恢复原始语言名用于显示，而 Shiki 仍使用别名内置语法进行高亮。
 * 同时覆盖图标以匹配原始语言：fumadocs 内置的 transformerIcon 在本 transformer
 * 之前运行（通过 enforce: "post" 保证），它基于别名语言（如 ini）解析图标，
 * 无法命中原始语言的图标快捷方式（如 gitattributes → git）。
 */

// Icon config shape, mirroring fumadocs' rehypeCodeOptions.icon option.
// 图标配置结构，对应 fumadocs rehypeCodeOptions.icon 选项。
interface IconEntry {
  viewBox: string;
  fill: string;
  d: string;
}

interface IconConfig {
  extend?: Record<string, IconEntry>;
  shortcuts?: Record<string, string>;
}

export function transformerMetaTitle() {
  return {
    name: 'rehype-code:meta-title',
    // Run after fumadocs' transformerIcon (which has no enforce, i.e. "normal")
    // so we can override the icon it computed from the aliased lang.
    // 在 fumadocs transformerIcon（无 enforce，属 normal）之后运行，
    // 以覆盖其基于别名语言计算的图标。
    enforce: 'post' as const,
    pre(
      this: {
        options?: {
          meta?: { title?: unknown; __raw?: string };
          lang?: string;
          // fumadocs passes the full icon option through to Shiki's codeOptions,
          // so it is available on the transformer context at runtime.
          // fumadocs 将完整 icon 选项透传到 Shiki codeOptions，
          // 运行时可在 transformer 上下文中访问。
          icon?: IconConfig | false;
        };
      },
      pre: { properties?: Record<string, unknown> },
    ) {
      const title = this.options?.meta?.title;
      const raw = this.options?.meta?.__raw;
      const lang = this.options?.lang;
      const iconConfig = this.options?.icon;

      if (typeof title === 'string') {
        pre.properties ??= {};
        pre.properties.title = title;
      }
      if (typeof lang === 'string') {
        pre.properties ??= {};
        // Restore original language from meta (e.g., "originalLang=gitattributes")
        // 从 meta 中恢复原始语言名（例如 "originalLang=gitattributes"）
        const match = typeof raw === 'string' ? raw.match(/originalLang=(\S+)/) : null;
        if (match) {
          const originalLang = match[1];
          pre.properties.lang = originalLang;

          // Override the icon: transformerIcon used the aliased lang (e.g., 'ini')
          // and could not resolve originalLang's icon via shortcuts. Re-resolve
          // using the original lang against the same icon config.
          // 覆盖图标：transformerIcon 使用别名语言（如 ini），
          // 无法通过 shortcuts 解析原始语言的图标。用原始语言重新解析。
          if (iconConfig) {
            const shortcuts = iconConfig.shortcuts;
            const extend = iconConfig.extend;
            if (shortcuts && extend) {
              const iconName =
                originalLang in shortcuts ? shortcuts[originalLang] : originalLang;
              const icon = extend[iconName];
              if (icon) {
                pre.properties.icon = `<svg viewBox="${icon.viewBox}"><path d="${icon.d}" fill="${icon.fill}" /></svg>`;
              }
            }
          }
        } else {
          pre.properties.lang = lang;
        }
      }
      return pre;
    },
  };
}
