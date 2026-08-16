import type { ContentStatus } from '@/content/maintenance';
import { TransitionLink } from '@/features/transition';

interface DocsContentStatusProps {
  badge: string;
  description: string;
  replacementAction: string;
  replacementHref?: string;
  status: Extract<ContentStatus, 'review' | 'deprecated'>;
}

/**
 * Small server-rendered notice for lifecycle states that need reader context.
 * 稳定状态不渲染提示；只有需要读者上下文的生命周期状态才显示此服务端通知。
 */
export function DocsContentStatus({
  badge,
  description,
  replacementAction,
  replacementHref,
  status,
}: DocsContentStatusProps) {
  return (
    <aside
      aria-label={badge}
      className={`docs-content-status docs-content-status--${status}`}
      data-docs-content-status={status}
    >
      <span className="docs-content-status__badge">{badge}</span>
      <p className="docs-content-status__description">{description}</p>
      {replacementHref && (
        <TransitionLink className="docs-content-status__link" href={replacementHref}>
          {replacementAction}
        </TransitionLink>
      )}
    </aside>
  );
}
