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

type TaskAnimation = 'complete' | 'reopen';

// The animation flag is cleared once the longest keyframe has finished so the
// data-task-animation attribute never lingers on the node and the next
// interaction always starts from a clean undefined → value transition.
// Resting checked/unchecked styles come from :checked and data-task-checked,
// so removing the attribute causes no visual regression. 560ms is the longest
// task keyframe (mdx-task-row-sheen); the buffer guarantees every animation
// has settled before the attribute is removed.
// 动画标记在最长关键帧结束后清除，使 data-task-animation 属性不会残留在节点上，
// 且下次交互始终从 undefined → 具体值的干净切换开始。勾选/未勾选的静态样式由
// :checked 与 data-task-checked 提供，移除属性不会造成视觉回退。560ms 为最长
// 关键帧（mdx-task-row-sheen），缓冲确保移除属性前所有动画均已结束。
const TASK_ANIMATION_RESET_DELAY = 600;

const TASK_STORAGE_PREFIX = 'neoverse-mdx-task-state:v1';

// Page-level progress widgets listen for this event instead of coupling task
// items through a global state library.
// 页面级进度组件监听此事件，避免为了任务清单额外引入全局状态库。
export const TASK_STATE_CHANGE_EVENT = 'neoverse:task-state-change';

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
  // Animation intent is set only by direct interaction, so restoring persisted
  // tasks never launches a burst across the page during hydration.
  // 动画意图仅由直接交互设置，恢复持久化任务时不会在 hydration 阶段触发整页粒子效果。
  const [animation, setAnimation] = useState<TaskAnimation>();

  useEffect(() => {
    const storedState = getStoredTaskState(storageKey);
    setChecked(
      Object.hasOwn(storedState, taskKey) ? Boolean(storedState[taskKey]) : initialChecked,
    );
  }, [initialChecked, storageKey, taskKey]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(TASK_STATE_CHANGE_EVENT, { detail: checked }));
  }, [checked]);

  // Reset the animation flag once the keyframes finish so the next interaction
  // starts from a clean state instead of reusing a lingering attribute value.
  // 动画关键帧结束后重置标记，使下次交互从干净状态开始，而非复用残留的属性值。
  useEffect(() => {
    if (!animation) return;
    const timer = setTimeout(() => setAnimation(undefined), TASK_ANIMATION_RESET_DELAY);
    return () => clearTimeout(timer);
  }, [animation]);

  function handleCheckedChange(nextChecked: boolean) {
    setChecked(nextChecked);
    setAnimation(nextChecked ? 'complete' : 'reopen');
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
      data-task-animation={animation}
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
