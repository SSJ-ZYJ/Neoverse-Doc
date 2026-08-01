// Project-owned MDX navigation cards. Their API is content-oriented while the
// underlying surface and edge response remain implementation details.
// 项目自有 MDX 导航卡片：API 面向内容，底层表面与边缘响应保持为实现细节。

import { ArrowRight, ArrowUpRight, FileText, Globe } from 'lucide-react';
import type { ReactNode } from 'react';
import { TransitionLink } from '@/components/transition/transition-link';

interface DocCardProps {
  children?: ReactNode;
  description?: string;
  href: string;
  title: string;
}

interface DocGridProps {
  children: ReactNode;
}

export function DocGrid({ children }: DocGridProps) {
  return <div className="mdx-doc-grid">{children}</div>;
}

export function DocCard({ children, description, href, title }: DocCardProps) {
  const isExternal = /^https?:\/\//.test(href);
  const destination = getExternalDestination(href);
  const ContextIcon = isExternal ? Globe : FileText;
  const ActionIcon = isExternal ? ArrowUpRight : ArrowRight;

  return (
    <TransitionLink
      className="mdx-doc-card"
      data-card="true"
      data-external={isExternal ? 'true' : undefined}
      href={href}
    >
      {/* Compact semantic icon and action affordance make destination type
          scannable without adding localized UI copy.
          紧凑语义图标与跳转反馈无需新增本地化文案即可快速区分目标类型。 */}
      <span className="mdx-doc-card__icon" aria-hidden="true">
        <ContextIcon size={18} strokeWidth={1.8} />
      </span>
      <span className="mdx-doc-card__header">
        <strong>{title}</strong>
        <span className="mdx-doc-card__action" aria-hidden="true">
          <ActionIcon size={15} strokeWidth={2} />
        </span>
      </span>
      {(description || children) && (
        <span className="mdx-doc-card__description">{description ?? children}</span>
      )}
      {destination && <span className="mdx-doc-card__destination">{destination}</span>}
    </TransitionLink>
  );
}

function getExternalDestination(href: string) {
  if (!/^https?:\/\//.test(href)) return null;

  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// Semantic aliases of DocCard kept for MDX content compatibility. They allow
// authors to express intent (feature highlight vs. resource link) in MDX
// without changing the rendered surface. Direct alias (not a wrapper function)
// avoids an extra React component in the tree.
// DocCard 的语义别名，保留以维持 MDX 内容兼容性。允许作者在 MDX 中
// 表达意图（特性卡 vs 资源链接）而不改变渲染表面。使用直接别名而非包装函数，
// 避免在 React 树中产生多余的组件层级。
export const FeatureCard = DocCard;
export const ResourceLink = DocCard;

// LearningPath mirrors DocGrid for the same intent-expression reason above.
// LearningPath 与 DocGrid 同理：用于在 MDX 中表达学习路径意图。
export const LearningPath = DocGrid;
