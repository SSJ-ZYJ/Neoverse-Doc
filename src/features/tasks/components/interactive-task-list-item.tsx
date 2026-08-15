/**
 * Client boundary for one Markdown task item. Completion state is persisted
 * by the stable Content ID and normalized task text so standard MDX syntax
 * stays unchanged; progress is shared across locales of the same content.
 *
 * 单个 Markdown 任务项的客户端边界。完成状态按稳定 Content ID 与规范化任务
 * 文本持久化，文档作者无需改变标准 MDX 语法；同一内容的各语言版本共享进度。
 */
'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';
import { useContentId } from '@/runtime/content-id';
import { publishTaskStateChange } from '../runtime/store';

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

// v2 keys by stable Content ID (cross-locale shared). v1 keys by pathname are
// lazily migrated on first visit: if v2 is still empty, the v1 payload moves
// over verbatim; the v1 key is then always removed. Whichever locale visits
// first wins the merge — the other locale's v1 payload is discarded, which is
// the accepted cost of unifying per-locale duplicates.
// v2 按稳定 Content ID 分桶（跨语言共享）。v1 按路径分桶，首次访问时懒迁移：
// v2 仍为空则原样搬运 v1 数据；随后 v1 key 总是被删除。先访问的语言赢得合并
// —— 另一语言的 v1 数据被放弃，这是合并各语言重复数据的既定代价。
const TASK_STORAGE_PREFIX = 'neoverse-mdx-task-state:v2';
const LEGACY_TASK_STORAGE_PREFIX = 'neoverse-mdx-task-state:v1';

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
  const contentId = useContentId();
  const { locale } = useI18n();
  const copy = getPageDictionary(resolveLocale(locale));
  const normalizedLabel = taskLabel || copy.taskListItem;
  // Inside the docs page the stable Content ID keys the bucket; without a
  // provider (e.g. MDX preview) fall back to pathname keying with the legacy
  // prefix, which also keeps the migration source addressable.
  // 文档页内以稳定 Content ID 分桶；无 Provider（如 MDX 预览）时回退按路径
  // 分桶并沿用旧前缀，同时保证迁移源 key 仍可寻址。
  const legacyPathnameKey = `${LEGACY_TASK_STORAGE_PREFIX}:${pathname}`;
  const storageKey = contentId
    ? `${TASK_STORAGE_PREFIX}:${contentId}`
    : `${LEGACY_TASK_STORAGE_PREFIX}:${pathname}`;
  const taskKey = hashTaskLabel(normalizedLabel);
  const [checked, setChecked] = useState(initialChecked);
  // Animation intent is set only by direct interaction, so restoring persisted
  // tasks never launches a burst across the page during hydration.
  // 动画意图仅由直接交互设置，恢复持久化任务时不会在 hydration 阶段触发整页粒子效果。
  const [animation, setAnimation] = useState<TaskAnimation>();

  // Lazy v1 → v2 migration, declared before the reader so it settles first.
  // v1 → v2 懒迁移，声明在读取 effect 之前以确保先完成迁移。
  useEffect(() => {
    if (!contentId) return;
    try {
      const legacyState = localStorage.getItem(legacyPathnameKey);
      if (legacyState === null) return;
      if (localStorage.getItem(storageKey) === null) {
        localStorage.setItem(storageKey, legacyState);
      }
      localStorage.removeItem(legacyPathnameKey);
    } catch {
      // Storage unavailable (private mode etc.) — keep using in-memory state.
      // 存储不可用（隐私模式等）—— 继续使用内存内状态。
    }
  }, [contentId, legacyPathnameKey, storageKey]);

  useEffect(() => {
    const storedState = getStoredTaskState(storageKey);
    setChecked(
      Object.hasOwn(storedState, taskKey) ? Boolean(storedState[taskKey]) : initialChecked,
    );
  }, [initialChecked, storageKey, taskKey]);

  useEffect(() => {
    void checked;
    publishTaskStateChange();
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
      <span className="mdx-task-item__content">
        <span className="mdx-task-item__label">{children}</span>
      </span>
    </li>
  );
}
