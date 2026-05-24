'use client';

import { TOCProvider, useTOCItems } from 'fumadocs-ui/components/toc';
import { I18nLabel } from 'fumadocs-ui/contexts/i18n';
import { cn } from 'fumadocs-ui/utils/cn';
import { Text } from 'lucide-react';
import type { ReactNode } from 'react';

interface TOCProps {
  header?: ReactNode;
  footer?: ReactNode;
}

function TOC({ header, footer }: TOCProps) {
  const items = useTOCItems();

  if (items.length === 0) return null;

  return (
    <aside
      className={cn(
        'hidden lg:block',
        'w-[200px] shrink-0',
        'sticky top-20 h-[calc(100vh-5rem)]',
        'self-start'
      )}
    >
      {header}
      <h3 className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground mb-3">
        <Text className="size-4" />
        <I18nLabel label="toc" />
      </h3>
      <nav className="text-sm">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.url}>
              <a
                href={item.url}
                className={cn(
                  'block py-1.5 ps-3 text-fd-muted-foreground transition-colors',
                  'border-l border-fd-border',
                  'hover:text-fd-accent-foreground hover:border-fd-primary',
                  item.active && 'text-fd-primary border-fd-primary'
                )}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {footer}
    </aside>
  );
}

interface DocsPageWithTOCProps {
  toc: Array<{ url: string; title: string; depth?: number }>;
  children: ReactNode;
}

export function DocsPageWithTOC({ toc, children }: DocsPageWithTOCProps) {
  return (
    <TOCProvider toc={toc}>
      <div className="flex w-full justify-center gap-8 px-4 md:px-6 xl:px-8">
        <div className="flex-1 min-w-0 max-w-[900px]">{children}</div>
        <TOC />
      </div>
    </TOCProvider>
  );
}
