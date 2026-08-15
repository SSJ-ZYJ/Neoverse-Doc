import type { Paragraph, PhrasingContent, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const DETAILS_REGEX = /^\[!DETAILS(?:-(FAQ|ANSWER|EXAMPLE|HINT|AI))?(\+?)\]/i;

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
 *   [!DETAILS-AI] / [!DETAILS-AI+]       - AI-generated summary block
 *
 * Remark 插件：将以 `[!DETAILS]` 等开头的引用块转换为
 * HTML `<details>` / `<summary>` 可折叠块。
 */

type CollapsibleType = 'details' | 'faq' | 'answer' | 'example' | 'hint' | 'ai';
type Locale = 'zh' | 'en';

// Collapsible variant map: adds semantic aliases while keeping the `[!DETAILS-XXX]` syntax stable.
// 折叠块变体映射：在保持 `[!DETAILS-XXX]` 语法稳定的前提下增加语义别名。
const VARIANT_MAP: Record<string, CollapsibleType> = {
  FAQ: 'faq',
  ANSWER: 'answer',
  EXAMPLE: 'example',
  HINT: 'hint',
  AI: 'ai',
};

// Localized default titles for collapsible blocks when the summary text is omitted.
// 折叠块未提供摘要文本时使用的本地化默认标题。
const DEFAULT_TITLES: Record<Locale, Record<CollapsibleType, string>> = {
  zh: {
    details: '折叠块',
    faq: '常见问题',
    answer: '答案',
    example: '示例',
    hint: '提示',
    ai: 'AI 摘要',
  },
  en: {
    details: 'Details',
    faq: 'FAQ',
    answer: 'Answer',
    example: 'Example',
    hint: 'Hint',
    ai: 'AI Summary',
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

interface SplitInlineDetails {
  summaryNodes: PhrasingContent[];
  inlineBodyChildren: PhrasingContent[];
}

// Split marker paragraph into summary and inline body at the first hard line break.
// 按第一个硬换行将标记段落拆分为标题和内联正文。
function splitInlineDetailsNodes(children: PhrasingContent[]): SplitInlineDetails {
  const [firstNode, ...restNodes] = children;
  if (firstNode?.type !== 'text') return { summaryNodes: [], inlineBodyChildren: [] };

  const nodesAfterMarker: PhrasingContent[] = [
    { ...firstNode, value: firstNode.value.replace(DETAILS_REGEX, '').replace(/^\n+/, '') },
    ...restNodes,
  ];
  const summaryNodes: PhrasingContent[] = [];
  const inlineBodyChildren: PhrasingContent[] = [];
  let foundBodyBreak = false;

  for (const child of nodesAfterMarker) {
    if (foundBodyBreak) {
      inlineBodyChildren.push(child);
      continue;
    }

    if (child.type !== 'text') {
      summaryNodes.push(child);
      continue;
    }

    const lineBreakMatch = child.value.match(/\r?\n/);
    if (!lineBreakMatch || lineBreakMatch.index === undefined) {
      summaryNodes.push(child);
      continue;
    }

    const summaryText = child.value.slice(0, lineBreakMatch.index);
    const bodyText = child.value.slice(lineBreakMatch.index + lineBreakMatch[0].length);
    if (summaryText) summaryNodes.push({ ...child, value: summaryText });
    if (bodyText) inlineBodyChildren.push({ ...child, value: bodyText });
    foundBodyBreak = true;
  }

  return {
    summaryNodes: trimPhrasingEnd(trimPhrasingStart(summaryNodes)),
    inlineBodyChildren: trimPhrasingStart(inlineBodyChildren),
  };
}

function trimPhrasingStart(children: PhrasingContent[]) {
  const trimmed = [...children];
  while (trimmed[0]?.type === 'text') {
    const value = trimmed[0].value.trimStart();
    if (value) {
      trimmed[0] = { ...trimmed[0], value };
      break;
    }
    trimmed.shift();
  }
  return trimmed;
}

function trimPhrasingEnd(children: PhrasingContent[]) {
  const trimmed = [...children];
  while (trimmed.at(-1)?.type === 'text') {
    const lastNode = trimmed.at(-1);
    if (lastNode?.type !== 'text') break;

    const value = lastNode.value.trimEnd();
    if (value) {
      trimmed[trimmed.length - 1] = { ...lastNode, value };
      break;
    }
    trimmed.pop();
  }
  return trimmed;
}

function hasPhrasingContent(children: PhrasingContent[]) {
  return children.some((child) => child.type !== 'text' || child.value.trim() !== '');
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
      const variantKey = match[1]?.toUpperCase();
      const collapsibleType: CollapsibleType = variantKey
        ? (VARIANT_MAP[variantKey] ?? 'details')
        : 'details';
      const splitDetails = splitInlineDetailsNodes(firstChild.children);

      let summaryNodes: PhrasingContent[] = [];
      const contentStartIndex = 1;

      if (hasPhrasingContent(splitDetails.summaryNodes)) {
        // Inline summary supports plain text and formatted phrasing nodes before the first line break.
        // 内联标题支持第一个换行前的纯文本与格式化短语节点。
        summaryNodes = splitDetails.summaryNodes;
      } else {
        // No summary provided: use default title
        // 未提供摘要：使用默认标题
        summaryNodes = [{ type: 'text', value: DEFAULT_TITLES[locale][collapsibleType] }];
      }

      // Support markdownlint-friendly details syntax without a blank `>` separator line.
      // 支持不使用空 `>` 分隔行的 markdownlint 友好折叠块语法。
      const inlineBodyNodes: Paragraph[] = hasPhrasingContent(splitDetails.inlineBodyChildren)
        ? [
            {
              type: 'paragraph',
              children: splitDetails.inlineBodyChildren,
            },
          ]
        : [];

      // Remove leading empty paragraphs used as separators
      // 过滤掉作为分隔符的前导空段落
      const bodyNodes = [...inlineBodyNodes, ...node.children.slice(contentStartIndex)];
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
          'data-nd-interaction': 'surface',
          open: isOpen || undefined,
        },
      };

      node.children = [summaryParagraph, ...bodyNodes];
    });
  };
};
