import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { MessageSquareText } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Guestbook } from '@/components/guestbook';
import { Mermaid } from '@/components/mermaid';
import { getPageDictionary } from '@/dictionaries';
import { i18n, type Locale } from '@/lib/i18n';
import { source } from '@/lib/source';

export default async function Page(props: PageProps<'/[lang]/docs/[...slug]'>) {
  const { slug, lang } = await props.params;
  const locale = (lang as Locale) ?? i18n.defaultLanguage;
  const dict = getPageDictionary(locale);
  const page = source.getPage(slug, locale);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents, Mermaid }} />
      </DocsBody>
      <div className="mt-16 border-t border-fd-border pt-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-fd-accent text-fd-accent-foreground">
            <MessageSquareText size={18} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fd-foreground">{dict.communityTitle}</h3>
            <p className="text-sm text-fd-muted-foreground">{dict.communityDesc}</p>
          </div>
        </div>
        <Guestbook />
      </div>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<'/[lang]/docs/[...slug]'>,
): Promise<Metadata> {
  const { slug, lang } = await props.params;
  const locale = (lang as Locale) ?? i18n.defaultLanguage;
  const page = source.getPage(slug, locale);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
