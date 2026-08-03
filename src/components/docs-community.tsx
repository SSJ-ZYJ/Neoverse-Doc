// Independent document-community module keeps Giscus layout changes outside the article surface.
// 独立文档社区模块将 Giscus 布局变化隔离在正文表面之外。

import { MessageSquareText } from 'lucide-react';
import { Guestbook } from '@/components/guestbook';

interface DocsCommunityProps {
  description: string;
  slugKey: string;
  title: string;
}

export function DocsCommunity({ description, slugKey, title }: DocsCommunityProps) {
  return (
    <section className="docs-community-module" aria-labelledby="docs-community-title">
      <div className="docs-community__header">
        <div className="docs-community__icon glass-chip" aria-hidden="true">
          <MessageSquareText size={18} />
        </div>
        <div className="docs-community__copy">
          <h2 id="docs-community-title">{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {/* Giscus stays in its own natural-flow module without introducing a nested scroll trap.
          Giscus 保持在独立的自然流模块中，不再引入嵌套滚动陷阱。 */}
      <div className="docs-community__content">
        <Guestbook slugKey={slugKey} />
      </div>
    </section>
  );
}
