// Restricted page-actions popover: Fumadocs' ViewOptionsPopover hardcodes AI
// integrations (Scira / ChatGPT / Claude / Cursor) with no prop to disable them,
// so this local variant keeps only the source-focused actions reusing the same
// fumadocs-ui Popover primitives and item styling.
// 受限页面操作弹层：Fumadocs 的 ViewOptionsPopover 硬编码了 AI 集成项（Scira
// / ChatGPT / Claude / Cursor）且没有禁用开关，因此本地复刻版本仅保留源码类
// 操作，复用 fumadocs-ui 的 Popover 原语与条目样式。
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'fumadocs-ui/components/ui/popover';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { ChevronDown, ExternalLink, Text } from 'lucide-react';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';

interface DocsPageActionsProps {
  githubUrl: string;
  markdownUrl: string;
}

function GithubIcon() {
  return (
    <svg fill="currentColor" role="img" viewBox="0 0 24 24">
      <title>GitHub</title>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function DocsPageActions({ githubUrl, markdownUrl }: DocsPageActionsProps) {
  const { locale } = useI18n();
  const dict = getPageDictionary(resolveLocale(locale));
  const itemClass =
    'text-sm p-2 rounded-lg inline-flex items-center gap-2 hover:text-fd-accent-foreground hover:bg-fd-accent [&_svg]:size-4';

  return (
    <div className="docs-page-actions">
      <Popover>
        <PopoverTrigger aria-label={dict.pageActionsLabel} className="inline-flex items-center gap-2 text-sm">
          {dict.pageActionsLabel}
          <ChevronDown aria-hidden="true" className="size-3.5 text-fd-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="flex flex-col">
          <a className={itemClass} href={markdownUrl} rel="noreferrer noopener" target="_blank">
            <Text />
            {dict.pageActionsViewSource}
            <ExternalLink className="text-fd-muted-foreground size-3.5 ms-auto" />
          </a>
          <a className={itemClass} href={githubUrl} rel="noreferrer noopener" target="_blank">
            <GithubIcon />
            {dict.pageActionsOpenGithub}
            <ExternalLink className="text-fd-muted-foreground size-3.5 ms-auto" />
          </a>
        </PopoverContent>
      </Popover>
    </div>
  );
}