'use client';

import { TOCScrollArea, useTOCItems } from 'fumadocs-ui/components/toc';
import { I18nLabel } from 'fumadocs-ui/contexts/i18n';
import { cn } from 'fumadocs-ui/utils/cn';
import { Text } from 'lucide-react';

interface TOCProps {
  container?: React.HTMLAttributes<HTMLDivElement>;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  style?: 'normal' | 'clerk';
  list?: React.HTMLAttributes<HTMLDivElement>;
}

export function CustomTOC({ container, header, footer, style = 'normal', list }: TOCProps) {
  const items = useTOCItems();

  if (items.length === 0) return null;

  return (
    <div
      id="nd-toc"
      {...container}
      className={cn(
        'nd-toc-sidebar',
        'sticky top-16 h-[calc(100vh-4rem)]',
        'flex flex-col',
        'w-[220px] shrink-0',
        'pt-12 pe-4 pb-2',
        container?.className
      )}
    >
      {header}
      <h3
        id="toc-title"
        className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground"
      >
        <Text className="size-4" />
        <I18nLabel label="toc" />
      </h3>
      <TOCScrollArea>
        <div className="relative min-h-0 text-sm ms-px overflow-auto [scrollbar-width:none] py-3">
          <div className="relative">
            <div
              className="absolute inset-y-0 inset-s-0 bg-fd-primary w-px transition-[clip-path]"
              style={{
                clipPath: 'polygon(0 var(--track-top,0), 100% var(--track-top,0), 100% var(--track-bottom,0), 0 var(--track-bottom,0))',
                '--track-top': '0px',
                '--track-bottom': '20px',
              } as React.CSSProperties}
            />
            <div className="flex flex-col border-s border-fd-foreground/10">
              {items.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  data-active={item.active}
                  className={cn(
                    'prose py-1.5 text-sm text-fd-muted-foreground scroll-m-4 transition-colors wrap-anywhere',
                    'first:pt-0 last:pb-0 ps-3',
                    'data-[active=true]:text-fd-primary hover:text-fd-accent-foreground'
                  )}
                >
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </TOCScrollArea>
      {footer}
    </div>
  );
}
