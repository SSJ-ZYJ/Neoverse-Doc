/**
 * Page-level progress summary for interactive Markdown task lists. It derives
 * its totals from the rendered document so authors keep using standard GFM syntax.
 *
 * 可交互 Markdown 任务清单的页面级进度概览。统计来自已渲染的文档，
 * 文档作者可以继续使用标准 GFM 语法。
 */
'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { ArrowDown, ListChecks } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { type MouseEvent, useEffect, useState } from 'react';
import { TASK_STATE_CHANGE_EVENT } from '@/components/mdx/interactive-task-list-item';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';
import { MOTION_DURATION_MS, prefersReducedMotion } from '@/lib/motion-config';

interface TaskProgress {
  completed: number;
  total: number;
  targetHash: string | null;
}

function readTaskProgress(pathname: string): TaskProgress {
  if (window.location.pathname !== pathname) {
    return { completed: 0, total: 0, targetHash: null };
  }

  const checkboxes = document.querySelectorAll<HTMLInputElement>(
    '[data-docs-body] .mdx-task-item__checkbox',
  );

  return {
    completed: Array.from(checkboxes).filter((checkbox) => checkbox.checked).length,
    total: checkboxes.length,
    targetHash: findTaskListHeadingHash(),
  };
}

function fillProgressLabel(template: string, progress: TaskProgress): string {
  return template
    .replace('{completed}', String(progress.completed))
    .replace('{total}', String(progress.total));
}

// Resolve the final task-list group to the hash generated for its preceding heading by Fumadocs.
// 将文末任务清单解析为 Fumadocs 为其前置标题生成的 Hash。
function findTaskListHeadingHash(): string | null {
  const docsBody = document.querySelector<HTMLElement>('[data-docs-body]');
  const taskLists = document.querySelectorAll<HTMLElement>(
    '[data-docs-body] ul.contains-task-list',
  );
  const taskList = taskLists.item(taskLists.length - 1);
  if (!docsBody || !taskList) return null;

  const headings = docsBody.querySelectorAll<HTMLElement>('h2, h3, h4, h5, h6');
  let targetHeading: HTMLElement | null = null;
  for (let index = headings.length - 1; index >= 0; index -= 1) {
    const heading = headings.item(index);
    if (heading.compareDocumentPosition(taskList) & Node.DOCUMENT_POSITION_FOLLOWING) {
      targetHeading = heading;
      break;
    }
  }

  return targetHeading?.id ? `#${targetHeading.id}` : null;
}

// Keep deferred MDX blocks materialized after native hash navigation so estimated heights
// cannot move the target again; only the CSS motion class is temporary.
// 原生 Hash 导航后持续实体化延迟 MDX 区块，避免估算高度再次移动目标；仅 CSS 动画类是临时的。
function enableTaskListSmoothScroll(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const root = document.documentElement;
  root.dataset.ndTaskListJump = '';
  if (!prefersReducedMotion()) root.classList.add('mdx-task-list-smooth-scroll');
  let cleanupTimeoutId = 0;

  function cleanupSmoothScroll() {
    root.classList.remove('mdx-task-list-smooth-scroll');
    window.removeEventListener('scrollend', cleanupSmoothScroll);
    window.clearTimeout(cleanupTimeoutId);
  }

  window.addEventListener('scrollend', cleanupSmoothScroll);
  cleanupTimeoutId = window.setTimeout(cleanupSmoothScroll, MOTION_DURATION_MS.nativeScrollCleanup);
}

export function TaskListProgress() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const copy = getPageDictionary(resolveLocale(locale));
  const [progress, setProgress] = useState<TaskProgress>({
    completed: 0,
    total: 0,
    targetHash: null,
  });

  useEffect(() => {
    const root = document.documentElement;

    function syncProgress() {
      setProgress(readTaskProgress(pathname));
    }

    syncProgress();
    window.addEventListener(TASK_STATE_CHANGE_EVENT, syncProgress);
    return () => {
      window.removeEventListener(TASK_STATE_CHANGE_EVENT, syncProgress);
      delete root.dataset.ndTaskListJump;
      root.classList.remove('mdx-task-list-smooth-scroll');
    };
  }, [pathname]);

  if (progress.total === 0) return null;

  const progressLabel = fillProgressLabel(copy.taskListProgressLabel, progress);

  return (
    <section className="glass-card mdx-task-progress" data-card="true" aria-label={progressLabel}>
      <div className="mdx-task-progress__heading">
        <span className="mdx-task-progress__icon" aria-hidden="true">
          <ListChecks size={18} />
        </span>
        <span>{copy.taskListProgressTitle}</span>
      </div>
      <div className="mdx-task-progress__controls">
        <div className="mdx-task-progress__stats" aria-hidden="true">
          <span>
            <strong>{progress.completed}</strong>
            {copy.taskListCompletedCount}
          </span>
          <span>
            <strong>{progress.total}</strong>
            {copy.taskListTotalCount}
          </span>
        </div>
        {progress.targetHash ? (
          <a
            className="mdx-task-progress__jump"
            href={progress.targetHash}
            onClick={enableTaskListSmoothScroll}
            title={copy.taskListJumpToList}
          >
            <span>{copy.taskListJumpToList}</span>
            <ArrowDown aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <progress
        className="mdx-task-progress__bar"
        value={progress.completed}
        max={progress.total}
        aria-label={progressLabel}
      />
    </section>
  );
}
