/**
 * Server-side MDX list-item router. It upgrades only GFM task-list items to a
 * small client component while leaving ordinary Markdown lists as native HTML.
 *
 * 服务端 MDX 列表项路由：仅将 GFM 任务列表项升级为小型客户端组件，
 * 普通 Markdown 列表继续保持原生 HTML。
 */

import {
  Children,
  type ComponentProps,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { InteractiveTaskListItem } from '@/components/mdx/interactive-task-list-item';

type TaskCheckboxElement = ReactElement<ComponentProps<'input'>>;

function isTaskCheckbox(node: ReactNode): node is TaskCheckboxElement {
  return (
    isValidElement<ComponentProps<'input'>>(node) &&
    node.type === 'input' &&
    node.props.type === 'checkbox'
  );
}

function extractTaskText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTaskText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractTaskText(node.props.children);
  }
  return '';
}

export function MdxListItem({ children, className, ...props }: ComponentProps<'li'>) {
  const childNodes = Children.toArray(children);
  const checkboxIndex = childNodes.findIndex(isTaskCheckbox);
  const isTaskItem = className?.split(/\s+/).includes('task-list-item') ?? false;

  if (!isTaskItem || checkboxIndex < 0) {
    return (
      <li className={className} {...props}>
        {children}
      </li>
    );
  }

  const checkbox = childNodes[checkboxIndex] as TaskCheckboxElement;
  const taskContent = childNodes.filter((_, index) => index !== checkboxIndex);
  const taskLabel = extractTaskText(taskContent).replace(/\s+/g, ' ').trim();

  return (
    <InteractiveTaskListItem
      className={className}
      initialChecked={Boolean(checkbox.props.checked ?? checkbox.props.defaultChecked)}
      taskLabel={taskLabel}
    >
      {taskContent}
    </InteractiveTaskListItem>
  );
}
