// Docs error boundary: catches runtime errors and delegates localized recovery
// UI to the shared route error component.
// 文档错误边界：捕获运行时错误，并交由共享路由错误组件渲染本地化恢复界面。

'use client';

import { LocalizedError } from '@/components/localized-error';

export default function DocsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry: () => void;
}) {
  return <LocalizedError variant="docs" reset={props.reset} retry={props.unstable_retry} />;
}
