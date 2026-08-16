/**
 * Local-only homepage island. The catalog is server-derived from Manifest;
 * the browser contributes only the latest validated activity entry.
 *
 * 仅依赖本地状态的首页客户端岛。目录由服务端从 Manifest 派生，浏览器只
 * 提供最近一条经过校验的活动记录。
 */

'use client';

import { ArrowRight, BookOpen } from 'lucide-react';
import type { ContinueLearningCatalog } from '@/content/projections';
import type { Dictionary } from '@/dictionaries';
import { useLearningActivity } from '@/features/tasks';
import { TransitionLink } from '@/features/transition';

function fillProgressLabel(template: string, completed: number, total: number): string {
  return template.replace('{completed}', String(completed)).replace('{total}', String(total));
}

export function ContinueLearningCard({
  catalog,
  copy,
}: {
  catalog: ContinueLearningCatalog;
  copy: Dictionary['home'];
}) {
  const activity = useLearningActivity(catalog.validContentIds);
  if (!activity || activity.entries.length === 0) return null;

  const latest = activity.entries[0];
  if (!latest) return null;
  const content = catalog.entries.find((entry) => entry.contentId === latest.contentId);
  if (!content) return null;

  const progress = latest.progress;

  return (
    <section aria-labelledby="home-continue-learning-title" className="home-continue-learning">
      <div className="home-continue-learning__heading">
        <span className="home-continue-learning__icon" aria-hidden="true">
          <BookOpen size={18} />
        </span>
        <h2 id="home-continue-learning-title">{copy.continueLearningTitle}</h2>
      </div>
      <TransitionLink
        className="home-continue-learning__card surface-panel glass-interactive"
        data-nd-interaction="control"
        href={content.href}
        transition="surface"
      >
        <span className="home-continue-learning__content">
          {content.trackLabel && <span>{content.trackLabel}</span>}
          <strong>{content.title}</strong>
          {progress && (
            <span>
              {fillProgressLabel(
                copy.continueLearningTaskProgress,
                progress.completed,
                progress.total,
              )}
            </span>
          )}
        </span>
        <span className="home-continue-learning__action">
          {copy.continueLearningAction}
          <ArrowRight aria-hidden="true" size={17} />
        </span>
      </TransitionLink>
    </section>
  );
}
