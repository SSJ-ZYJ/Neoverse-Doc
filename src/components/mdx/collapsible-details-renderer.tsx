/**
 * Server-side details router: native details stay static while AI blocks opt into hydration.
 * This keeps long documents with many ordinary disclosure blocks out of the client boundary.
 *
 * 服务端折叠块路由：普通 details 保持静态，仅 AI 折叠块进入客户端注水边界。
 * 这样长文档中的普通折叠内容无需承担客户端运行成本。
 */

import type { ComponentProps } from 'react';
import { CollapsibleDetails as AiCollapsibleDetails } from '@/components/mdx/collapsible-details';

const AI_DETAILS_CLASS = 'markdown-details-ai';

export function CollapsibleDetailsRenderer(props: ComponentProps<'details'>) {
  if (hasClassName(props.className, AI_DETAILS_CLASS)) {
    return <AiCollapsibleDetails {...props} />;
  }

  return <details {...props} />;
}

function hasClassName(className: unknown, targetClassName: string) {
  return typeof className === 'string' && className.split(/\s+/).includes(targetClassName);
}
