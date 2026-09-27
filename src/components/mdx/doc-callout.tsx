import { CircleCheck, CircleX, Info, Lightbulb, TriangleAlert } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { CalloutDescription, CalloutTitle } from 'fumadocs-ui/components/callout';
import { UiNotice, type NoticeVariant } from '@neoverse-ui/react';

type DocCalloutType = 'info' | 'warn' | 'error' | 'success' | 'warning' | 'idea' | 'tip' | 'neutral' | 'danger';

type DocCalloutProps = Omit<ComponentProps<'div'>, 'title'> & {
  title?: ReactNode;
  type?: DocCalloutType;
  icon?: ReactNode;
};

const calloutIcons: Partial<Record<DocCalloutType, typeof Info>> = {
  error: CircleX,
  idea: Lightbulb,
  info: Info,
  success: CircleCheck,
  tip: Lightbulb,
  warn: TriangleAlert,
  warning: TriangleAlert,
} satisfies Record<string, typeof Info>;

function noticeVariantFor(type: DocCalloutType): NoticeVariant {
  if (type === 'neutral') return 'neutral';
  if (type === 'success') return 'success';
  if (type === 'warn' || type === 'warning') return 'warning';
  if (type === 'error' || type === 'danger') return 'danger';
  return 'info';
}

function DocCalloutFrame({
  children,
  className,
  icon,
  style,
  title,
  type = 'info',
  ...props
}: DocCalloutProps) {
  const Icon = calloutIcons[type] ?? Info;
  const statusIcon =
    icon ?? <Icon aria-hidden="true" className="size-5 shrink-0" />;

  return (
    <UiNotice
      {...props}
      className={['my-4 items-start justify-start text-sm', className].filter(Boolean).join(' ')}
      data-callout-type={type}
      style={style}
      variant={noticeVariantFor(type)}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--ui-notice-tone)]">
        {statusIcon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {title ? <CalloutTitle>{title}</CalloutTitle> : null}
        <CalloutDescription>{children}</CalloutDescription>
      </div>
    </UiNotice>
  );
}

/** Preserve Fumadocs Callout props while sharing the Neoverse status surface. */
export function DocCallout(props: DocCalloutProps) {
  return <DocCalloutFrame {...props} />;
}

/** Preserve the lower-level Fumadocs callout composition contract. */
export function DocCalloutContainer(props: DocCalloutProps) {
  return <DocCalloutFrame {...props} />;
}