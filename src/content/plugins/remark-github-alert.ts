import type { BlockContent, DefinitionContent, Paragraph, PhrasingContent, Root } from 'mdast';
import { getAlertIcon } from 'remark-github-blockquote-alert';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const ALERT_REGEX = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|INFO)\]/i;

type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution' | 'info';
type AlertIconType = Parameters<typeof getAlertIcon>[0];
type AlertBodyContent = BlockContent | DefinitionContent;

// Alert icon mapping keeps the package-provided GitHub octicons while adding the project INFO alias.
// Alert 图标映射复用依赖包提供的 GitHub octicon，同时补充项目扩展的 INFO 别名。
const ALERT_ICON_TYPES: Record<AlertType, AlertIconType> = {
  note: 'note',
  tip: 'tip',
  important: 'important',
  warning: 'warning',
  caution: 'caution',
  info: 'note',
};

interface SplitInlineAlert {
  titleNodes: PhrasingContent[];
  inlineBodyChildren: PhrasingContent[];
}

// Split the marker paragraph so text after `[!TYPE]` becomes the custom alert title.
// 拆分 alert 标记段落，使 `[!TYPE]` 后同一行文本成为自定义标题。
function splitInlineAlertNodes(children: PhrasingContent[]): SplitInlineAlert {
  const [firstNode, ...restNodes] = children;
  if (firstNode?.type !== 'text') return { titleNodes: [], inlineBodyChildren: [] };

  const nodesAfterMarker: PhrasingContent[] = [
    {
      ...firstNode,
      value: firstNode.value.replace(ALERT_REGEX, '').replace(/^[\t ]+/, ''),
    },
    ...restNodes,
  ];
  const titleNodes: PhrasingContent[] = [];
  const inlineBodyChildren: PhrasingContent[] = [];
  let foundBodyBreak = false;

  for (const child of nodesAfterMarker) {
    if (foundBodyBreak) {
      inlineBodyChildren.push(child);
      continue;
    }

    if (child.type === 'break') {
      foundBodyBreak = true;
      continue;
    }

    if (child.type !== 'text') {
      titleNodes.push(child);
      continue;
    }

    const lineBreakMatch = child.value.match(/\r?\n/);
    if (!lineBreakMatch || lineBreakMatch.index === undefined) {
      titleNodes.push(child);
      continue;
    }

    const titleText = child.value.slice(0, lineBreakMatch.index);
    const bodyText = child.value.slice(lineBreakMatch.index + lineBreakMatch[0].length);
    if (titleText) titleNodes.push({ ...child, value: titleText });
    if (bodyText) inlineBodyChildren.push({ ...child, value: bodyText });
    foundBodyBreak = true;
  }

  return {
    titleNodes: trimPhrasingEnd(trimPhrasingStart(titleNodes)),
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

function dropLeadingEmptyParagraphs(children: AlertBodyContent[]) {
  const trimmed = [...children];
  while (trimmed.length > 0) {
    const child = trimmed[0];
    if (child.type !== 'paragraph') break;
    if (child.children.length === 0) {
      trimmed.shift();
    } else if (
      child.children.length === 1 &&
      child.children[0].type === 'text' &&
      child.children[0].value.trim() === ''
    ) {
      trimmed.shift();
    } else {
      break;
    }
  }
  return trimmed;
}

export const remarkGithubAlert: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'blockquote', (node) => {
      const firstChild = node.children[0];
      if (firstChild?.type !== 'paragraph') return;

      const firstNode = firstChild.children[0];
      if (firstNode?.type !== 'text') return;

      const match = firstNode.value.match(ALERT_REGEX);
      if (!match) return;

      const alertType = match[1].toLowerCase() as AlertType;
      const splitAlert = splitInlineAlertNodes(firstChild.children);
      const titleNodes = hasPhrasingContent(splitAlert.titleNodes)
        ? splitAlert.titleNodes
        : [{ type: 'text' as const, value: alertType.toUpperCase() }];
      const inlineBodyNodes: Paragraph[] = hasPhrasingContent(splitAlert.inlineBodyChildren)
        ? [
            {
              type: 'paragraph',
              children: splitAlert.inlineBodyChildren,
            },
          ]
        : [];
      const bodyNodes = dropLeadingEmptyParagraphs([...inlineBodyNodes, ...node.children.slice(1)]);

      const titleParagraph: Paragraph = {
        type: 'paragraph',
        children: [getAlertIcon(ALERT_ICON_TYPES[alertType]), ...titleNodes],
        data: {
          hProperties: {
            className: 'markdown-alert-title',
            dir: 'auto',
          },
        },
      };

      node.data = {
        hName: 'div',
        hProperties: {
          className: ['markdown-alert', `markdown-alert-${alertType}`],
          dir: 'auto',
        },
      };
      node.children = [titleParagraph, ...bodyNodes];
    });
  };
};
