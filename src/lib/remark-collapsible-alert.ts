import type { Paragraph, PhrasingContent, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const DETAILS_REGEX = /^\[!DETAILS(?:-(FAQ|ANSWER|EXAMPLE|HINT))?(\+?)\]/i;

/**
 * Remark plugin: converts blockquotes starting with `[!DETAILS]` or `[!DETAILS+]`
 * into HTML `<details>` / `<summary>` collapsible blocks.
 *
 * Syntax:
 *   > [!DETAILS] Summary Title
 *   > Content body...
 *
 *   > [!DETAILS+]
 *   > Summary Title
 *   >
 *   > Content body... (expanded by default)
 *
 * Supported collapsible block types:
 *   [!DETAILS] / [!DETAILS+]             - Generic collapsible block
 *   [!DETAILS-FAQ] / [!DETAILS-FAQ+]     - Frequently Asked Questions
 *   [!DETAILS-ANSWER] / [!DETAILS-ANSWER+] - Answer (use with FAQ)
 *   [!DETAILS-EXAMPLE] / [!DETAILS-EXAMPLE+] - Example block
 *   [!DETAILS-HINT] / [!DETAILS-HINT+]   - Hint block
 *
 * Remark 插件：将以 `[!DETAILS]` 等开头的引用块转换为
 * HTML `<details>` / `<summary>` 可折叠块。
 */

type CollapsibleType = 'details' | 'faq' | 'answer' | 'example' | 'hint';
type Locale = 'zh' | 'en';

const VARIANT_MAP: Record<string, CollapsibleType> = {
  FAQ: 'faq',
  ANSWER: 'answer',
  EXAMPLE: 'example',
  HINT: 'hint',
};

const DEFAULT_TITLES: Record<Locale, Record<CollapsibleType, string>> = {
  zh: {
    details: '折叠块',
    faq: '常见问题',
    answer: '答案',
    example: '示例',
    hint: '提示',
  },
  en: {
    details: 'Details',
    faq: 'FAQ',
    answer: 'Answer',
    example: 'Example',
    hint: 'Hint',
  },
};

/**
 * Detect locale from file path (e.g. `content/docs/zh/...` → 'zh').
 * Falls back to 'zh' if detection fails.
 * 从文件路径检测语言（例如 `content/docs/zh/...` → 'zh'），检测失败时回退到 'zh'。
 */
function detectLocale(filePath?: string): Locale {
  if (!filePath) return 'zh';
  if (/[/\\]en[/\\]/.test(filePath)) return 'en';
  return 'zh';
}

export const remarkCollapsibleAlert: Plugin<[], Root> = () => {
  return (tree, file) => {
    const locale = detectLocale(file.path);

    visit(tree, 'blockquote', (node) => {
      const firstChild = node.children[0];
      if (firstChild?.type !== 'paragraph') return;

      const firstNode = firstChild.children[0];
      if (firstNode?.type !== 'text') return;

      const text = firstNode.value;
      const match = text.match(DETAILS_REGEX);
      if (!match) return;

      const isOpen = (match[2] ?? '') === '+';
      const remainingText = text.replace(DETAILS_REGEX, '').replace(/^\n+/, '').trim();

      const variantKey = match[1]?.toUpperCase();
      const collapsibleType: CollapsibleType = variantKey
        ? (VARIANT_MAP[variantKey] ?? 'details')
        : 'details';

      let summaryNodes: PhrasingContent[] = [];
      const contentStartIndex = 1;

      if (remainingText) {
        // Inline summary: > [!DETAILS] Summary Title
        // 内联摘要：> [!DETAILS] 摘要标题
        summaryNodes = [{ type: 'text', value: remainingText }, ...firstChild.children.slice(1)];
      } else if (firstChild.children.length > 1) {
        // Inline summary with other nodes (e.g. bold)
        // 内联摘要与其他节点（例如加粗）
        summaryNodes = firstChild.children.slice(1) as PhrasingContent[];
      } else {
        // No summary provided: use default title
        // 未提供摘要：使用默认标题
        summaryNodes = [{ type: 'text', value: DEFAULT_TITLES[locale][collapsibleType] }];
      }

      // Remove leading empty paragraphs used as separators
      // 过滤掉作为分隔符的前导空段落
      const bodyNodes = node.children.slice(contentStartIndex);
      while (bodyNodes.length > 0) {
        const child = bodyNodes[0];
        if (child.type !== 'paragraph') break;
        if (child.children.length === 0) {
          bodyNodes.shift();
        } else if (
          child.children.length === 1 &&
          child.children[0].type === 'text' &&
          child.children[0].value.trim() === ''
        ) {
          bodyNodes.shift();
        } else {
          break;
        }
      }

      // Render summary paragraph as <summary>
      // 将摘要段落渲染为 <summary>
      const summaryParagraph: Paragraph = {
        type: 'paragraph',
        children: summaryNodes,
        data: {
          hName: 'summary',
          hProperties: {
            className: ['markdown-details-summary', `markdown-details-type-${collapsibleType}`],
          },
        },
      };

      // Render blockquote as <details>
      // 将引用块渲染为 <details>
      node.data = {
        hName: 'details',
        hProperties: {
          className: ['markdown-details', `markdown-details-${collapsibleType}`],
          open: isOpen || undefined,
        },
      };

      node.children = [summaryParagraph, ...bodyNodes];
    });
  };
};
