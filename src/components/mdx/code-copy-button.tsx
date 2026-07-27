/**
 * Client-only copy control for server-rendered code blocks.
 * Keeping the interactive boundary on the button avoids hydrating highlighted code markup.
 *
 * 服务端渲染代码块使用的纯客户端复制控件。
 * 将交互边界限制在按钮上，避免为整段高亮代码执行注水。
 */

'use client';

// fumadocs-ui 16.11+ moved useTranslations to @fuma-translate/react and changed
// its API from a keyed object to a callable translation function.
// fumadocs-ui 16.11+ 将 useTranslations 迁移至 @fuma-translate/react，API 由对象改为可调用函数。
import { useTranslations } from '@fuma-translate/react';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { Check, Clipboard } from 'lucide-react';
import { useRef } from 'react';

export function CodeCopyButton() {
  const t = useTranslations();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [checked, onClick] = useCopyButton(() => {
    const pre = buttonRef.current?.closest('figure')?.querySelector('pre');
    if (!pre) return;

    const clone = pre.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.nd-copy-ignore').forEach((node) => {
      node.replaceWith('\n');
    });
    navigator.clipboard.writeText(clone.textContent ?? '');
  });

  return (
    <button
      ref={buttonRef}
      type="button"
      data-checked={checked || undefined}
      // Copy button: aligned with the unified glass-interactive--chip hover spec
      // (tint shift + soft glow, no lift). The copied state keeps semantic green feedback.
      // 复制按钮：沿用统一 chip 悬浮规范（tint 切换 + 柔辉光，不抬升）；
      // 已复制态保留绿色语义反馈。
      className="inline-flex items-center justify-center rounded-md p-1 text-fd-muted-foreground hover:text-fd-accent-foreground hover:bg-fd-accent/60 data-checked:text-green-600 data-checked:bg-green-500/10 dark:data-checked:text-green-400 dark:data-checked:bg-green-500/15 transition-all duration-200 cursor-pointer active:scale-95"
      aria-label={
        checked ? t('Copied Text(code block)(aria-label)') : t('Copy Text(code block)(aria-label)')
      }
      onClick={onClick}
    >
      {checked ? (
        <Check className="size-3.5 animate-in zoom-in-50 duration-200" />
      ) : (
        <Clipboard className="size-3.5" />
      )}
    </button>
  );
}
