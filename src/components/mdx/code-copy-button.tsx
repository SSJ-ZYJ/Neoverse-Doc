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
import { UiButton } from '@neoverse-ui/react';
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
    return navigator.clipboard.writeText(clone.textContent ?? '');
  });

  return (
    <UiButton
      ref={buttonRef}
      type="button"
      data-checked={checked || undefined}
      variant="ghost"
      surface="none"
      size="sm"
      className="docs-code-copy"
      aria-label={
        checked ? t('Copied Text(code block)(aria-label)') : t('Copy Text(code block)(aria-label)')
      }
      onClick={onClick}
    >
      {checked ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
    </UiButton>
  );
}
