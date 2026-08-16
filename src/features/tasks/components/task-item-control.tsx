/**
 * Shared visual and interaction shell for legacy GFM tasks and explicit
 * Learning Tasks. Persistence remains owned by each caller.
 *
 * 旧 GFM 任务与显式 Learning Task 共用的视觉和交互外壳。持久化仍由各自的
 * 调用方负责，避免把两种语义重新合并。
 */
'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { type ReactNode, useEffect, useState } from 'react';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';

type TaskAnimation = 'complete' | 'reopen';

interface TaskItemControlProps {
  children: ReactNode;
  checked: boolean;
  className?: string;
  onCheckedChange: (checked: boolean) => void;
  taskLabel: string;
}

// The animation flag is cleared once the longest keyframe has finished so the
// data-task-animation attribute never lingers on the node and the next
// interaction always starts from a clean undefined → value transition.
// 动画标记在最长关键帧结束后清除，使 data-task-animation 属性不会残留在节点上，
// 且下次交互始终从 undefined → 具体值的干净切换开始。
const TASK_ANIMATION_RESET_DELAY = 600;

export function TaskItemControl({
  children,
  checked,
  className,
  onCheckedChange,
  taskLabel,
}: TaskItemControlProps) {
  const { locale } = useI18n();
  const copy = getPageDictionary(resolveLocale(locale));
  const [animation, setAnimation] = useState<TaskAnimation>();

  useEffect(() => {
    if (!animation) return;
    const timer = setTimeout(() => setAnimation(undefined), TASK_ANIMATION_RESET_DELAY);
    return () => clearTimeout(timer);
  }, [animation]);

  function handleCheckedChange(nextChecked: boolean) {
    setAnimation(nextChecked ? 'complete' : 'reopen');
    onCheckedChange(nextChecked);
  }

  const actionLabel = (checked ? copy.taskListReopen : copy.taskListComplete).replace(
    '{title}',
    taskLabel,
  );

  return (
    <li
      className={['mdx-task-item', className].filter(Boolean).join(' ')}
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
      <span className="mdx-task-item__content">
        <span className="mdx-task-item__label">{children}</span>
      </span>
    </li>
  );
}
