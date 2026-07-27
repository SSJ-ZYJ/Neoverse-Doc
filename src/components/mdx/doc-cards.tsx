// Project-owned MDX navigation cards. Their API is content-oriented while the
// underlying surface and edge response remain implementation details.
// 项目自有 MDX 导航卡片：API 面向内容，底层表面与边缘响应保持为实现细节。

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
  return (
    <TransitionLink className="mdx-doc-card" href={href}>
      <strong>{title}</strong>
      {(description || children) && <span>{description ?? children}</span>}
    </TransitionLink>
  );
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
