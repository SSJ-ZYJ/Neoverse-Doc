// Locale-level error boundary: keeps non-doc route failures visually aligned
// with the docs error fallback and uses the shared localized retry behavior.
// 语言级错误边界：让非文档路由错误与文档错误回退保持一致，并复用本地化重试逻辑。

'use client';

import { LocalizedError } from '@/components/localized-error';

export default function LangError(props: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry: () => void;
}) {
  return <LocalizedError reset={props.reset} retry={props.unstable_retry} />;
}
