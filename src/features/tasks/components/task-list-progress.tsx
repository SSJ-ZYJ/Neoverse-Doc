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
import { type MouseEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';
import { prefersReducedMotion } from '@/runtime/motion/config';
import { getTaskStateRevision, subscribeTaskState } from '../runtime/store';
import { getTaskListScrollDuration, getTaskListScrollProgress } from '../scroll';

const TASK_LIST_SCROLL_MAX_STEP_RATIO = 1 / 4;
const TASK_LIST_SCROLL_INTERRUPT_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
]);

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

function resolveTaskListNavigation(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }

  const hash = event.currentTarget.getAttribute('href');
  if (!hash?.startsWith('#')) return null;
  const target = document.getElementById(hash.slice(1));
  return target ? { hash, target } : null;
}

// Limit every animation frame to a fraction of the viewport. On a busy main thread
// the animation takes longer instead of skipping headings, so Fumadocs' TOC observer
// receives each active anchor's exit update.
// 将每个动画帧的位移限制为视口的一部分。主线程繁忙时动画会自然延长而不是跨过标题，
// 从而让 Fumadocs TOC 观察器收到每个活动标题的离开更新。
function startTaskListSmoothScroll(
  target: HTMLElement,
  hash: string,
  onStop: () => void,
): () => void {
  let frameId = 0;
  let stopped = false;

  function stop() {
    if (stopped) return;
    stopped = true;
    if (frameId) window.cancelAnimationFrame(frameId);
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('pointerdown', stop);
    window.removeEventListener('popstate', stop);
    window.removeEventListener('keydown', handleKeyDown);
    onStop();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (TASK_LIST_SCROLL_INTERRUPT_KEYS.has(event.key)) stop();
  }

  const oldURL = window.location.href;
  if (window.location.hash !== hash) {
    window.history.pushState(window.history.state, '', hash);
    window.dispatchEvent(
      new HashChangeEvent('hashchange', {
        oldURL,
        newURL: window.location.href,
      }),
    );
  }

  window.addEventListener('wheel', stop, { passive: true });
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('pointerdown', stop, { passive: true });
  window.addEventListener('popstate', stop);
  window.addEventListener('keydown', handleKeyDown);

  frameId = window.requestAnimationFrame((startedAt) => {
    const scrollMarginTop = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const targetY = Math.min(
      Math.max(0, target.getBoundingClientRect().top + window.scrollY - scrollMarginTop),
      maxScrollY,
    );
    const startY = window.scrollY;
    const distance = targetY - startY;
    const duration = getTaskListScrollDuration(distance);
    const maxStep = Math.max(1, window.innerHeight * TASK_LIST_SCROLL_MAX_STEP_RATIO);

    function step(timestamp: number) {
      const elapsed = timestamp - startedAt;
      const progress = duration === 0 ? 1 : Math.min(1, elapsed / duration);
      const easedProgress = getTaskListScrollProgress(progress);
      const desiredY = startY + distance * easedProgress;
      const remainingDistance = targetY - window.scrollY;
      if (progress === 1 && Math.abs(remainingDistance) <= 1) {
        window.scrollTo({ top: targetY });
        stop();
        return;
      }

      const frameDistance = (progress === 1 ? targetY : desiredY) - window.scrollY;
      window.scrollBy({
        top: Math.sign(frameDistance) * Math.min(Math.abs(frameDistance), maxStep),
      });
      frameId = window.requestAnimationFrame(step);
    }

    step(startedAt);
  });

  return stop;
}

export function TaskListProgress() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const copy = getPageDictionary(resolveLocale(locale));
  const activeScrollRef = useRef<(() => void) | null>(null);
  const taskStateRevision = useSyncExternalStore(
    subscribeTaskState,
    getTaskStateRevision,
    getTaskStateRevision,
  );
  const [progress, setProgress] = useState<TaskProgress>({
    completed: 0,
    total: 0,
    targetHash: null,
  });

  useEffect(() => {
    void taskStateRevision;
    const root = document.documentElement;

    setProgress(readTaskProgress(pathname));
    return () => {
      activeScrollRef.current?.();
      activeScrollRef.current = null;
      delete root.dataset.ndTaskListJump;
    };
  }, [pathname, taskStateRevision]);

  function handleTaskListJump(event: MouseEvent<HTMLAnchorElement>) {
    const navigation = resolveTaskListNavigation(event);
    if (!navigation) return;

    document.documentElement.dataset.ndTaskListJump = '';
    if (prefersReducedMotion()) return;

    event.preventDefault();
    activeScrollRef.current?.();
    let cancelScroll = () => {};
    cancelScroll = startTaskListSmoothScroll(navigation.target, navigation.hash, () => {
      if (activeScrollRef.current === cancelScroll) activeScrollRef.current = null;
    });
    activeScrollRef.current = cancelScroll;
  }

  if (progress.total === 0) return null;

  const progressLabel = fillProgressLabel(copy.taskListProgressLabel, progress);

  return (
    <section
      className="glass-card mdx-task-progress"
      data-card="true"
      data-nd-interaction="control"
      aria-label={progressLabel}
    >
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
            onClick={handleTaskListJump}
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
