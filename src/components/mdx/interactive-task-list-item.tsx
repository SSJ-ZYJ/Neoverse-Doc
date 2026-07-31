/**
 * Client boundary for one Markdown task item. Completion state is persisted
 * by page pathname and normalized task text so standard MDX syntax stays unchanged.
 *
 * 单个 Markdown 任务项的客户端边界。完成状态按页面路径与规范化任务文本持久化，
 * 文档作者无需改变标准 MDX 语法。
 */
'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';

interface InteractiveTaskListItemProps {
  children: ReactNode;
  className?: string;
  initialChecked: boolean;
  taskLabel: string;
}

const TASK_STORAGE_PREFIX = 'neoverse-mdx-task-state:v1';

function getStoredTaskState(storageKey: string): Record<string, boolean> {
  try {
    const rawState = localStorage.getItem(storageKey);
    if (!rawState) return {};

    const parsedState: unknown = JSON.parse(rawState);
    if (typeof parsedState !== 'object' || parsedState === null || Array.isArray(parsedState)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedState).filter(([, value]) => typeof value === 'boolean'),
    );
  } catch {
    return {};
  }
}

function hashTaskLabel(label: string): string {
  let hash = 2166136261;

  for (let index = 0; index < label.length; index += 1) {
    hash ^= label.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function fillTaskLabel(template: string, title: string) {
  return template.replace('{title}', title);
}

export function InteractiveTaskListItem({
  children,
  className,
  initialChecked,
  taskLabel,
}: InteractiveTaskListItemProps) {
  const pathname = usePathname();
  const { locale } = useI18n();
  const copy = getPageDictionary(resolveLocale(locale));
  const normalizedLabel = taskLabel || copy.taskListItem;
  const storageKey = `${TASK_STORAGE_PREFIX}:${pathname}`;
  const taskKey = hashTaskLabel(normalizedLabel);
  const [checked, setChecked] = useState(initialChecked);

  useEffect(() => {
    const storedState = getStoredTaskState(storageKey);
    setChecked(
      Object.hasOwn(storedState, taskKey) ? Boolean(storedState[taskKey]) : initialChecked,
    );
  }, [initialChecked, storageKey, taskKey]);

  function handleCheckedChange(nextChecked: boolean) {
    setChecked(nextChecked);
    const storedState = getStoredTaskState(storageKey);
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...storedState,
        [taskKey]: nextChecked,
      }),
    );
  }

  const actionLabel = fillTaskLabel(
    checked ? copy.taskListReopen : copy.taskListComplete,
    normalizedLabel,
  );

  return (
    <li
      className={[className, 'mdx-task-item'].filter(Boolean).join(' ')}
      data-task-checked={checked}
    >
      <input
        className="mdx-task-item__checkbox"
        type="checkbox"
        aria-label={actionLabel}
        checked={checked}
        onChange={(event) => handleCheckedChange(event.currentTarget.checked)}
        title={actionLabel}
      />
      <span className="mdx-task-item__content">{children}</span>
    </li>
  );
}
