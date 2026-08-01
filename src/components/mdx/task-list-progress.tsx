/**
 * Page-level progress summary for interactive Markdown task lists. It derives
 * its totals from the rendered document so authors keep using standard GFM syntax.
 *
 * 可交互 Markdown 任务清单的页面级进度概览。统计来自已渲染的文档，
 * 文档作者可以继续使用标准 GFM 语法。
 */
'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { ListChecks } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TASK_STATE_CHANGE_EVENT } from '@/components/mdx/interactive-task-list-item';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';

interface TaskProgress {
  completed: number;
  total: number;
}

function readTaskProgress(pathname: string): TaskProgress {
  if (window.location.pathname !== pathname) return { completed: 0, total: 0 };

  const checkboxes = document.querySelectorAll<HTMLInputElement>(
    '[data-docs-body] .mdx-task-item__checkbox',
  );

  return {
    completed: Array.from(checkboxes).filter((checkbox) => checkbox.checked).length,
    total: checkboxes.length,
  };
}

function fillProgressLabel(template: string, progress: TaskProgress): string {
  return template
    .replace('{completed}', String(progress.completed))
    .replace('{total}', String(progress.total));
}

export function TaskListProgress() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const copy = getPageDictionary(resolveLocale(locale));
  const [progress, setProgress] = useState<TaskProgress>({ completed: 0, total: 0 });

  useEffect(() => {
    function syncProgress() {
      setProgress(readTaskProgress(pathname));
    }

    syncProgress();
    window.addEventListener(TASK_STATE_CHANGE_EVENT, syncProgress);
    return () => window.removeEventListener(TASK_STATE_CHANGE_EVENT, syncProgress);
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
      <progress
        className="mdx-task-progress__bar"
        value={progress.completed}
        max={progress.total}
        aria-label={progressLabel}
      />
    </section>
  );
}
