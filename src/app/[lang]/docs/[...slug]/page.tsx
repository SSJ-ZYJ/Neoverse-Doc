// Dynamic doc page: renders MDX content from the fumadocs source tree with
// Mermaid support and a Giscus discussion section at the bottom.
// Metadata (title / description) is generated from page frontmatter.
// 动态文档页：从 fumadocs source 树渲染 MDX 内容，支持 Mermaid 图表，
// 底部附带 Giscus 讨论区。元信息（标题/描述）从页面 frontmatter 生成。

import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { MessageSquareText } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Guestbook } from '@/components/guestbook';
import { CustomCodeBlock } from '@/components/mdx/custom-codeblock';
import { DocsAuthor, DocsContributors } from '@/components/mdx/docs-author';
import { Mermaid } from '@/components/mdx/mermaid';
import { DocsTransition } from '@/components/transition/docs-transition';
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
  const slugKey = slug.join('/');
  // Contributor frontmatter supports both singular and plural keys.
  // 贡献者 frontmatter 同时兼容单数与复数字段。
  const contributors = page.data.contributors ?? page.data.contributor;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full} tableOfContent={{ style: 'clerk' }}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {page.data.author && <DocsAuthor author={page.data.author} label={dict.primaryAuthorLabel} />}
      <DocsBody>
        <DocsTransition slugKey={slugKey}>
          <MDX
            components={{ ...defaultMdxComponents, Mermaid, pre: CustomCodeBlock, Tabs, Tab }}
          />
        </DocsTransition>
      </DocsBody>
      {contributors && (
        <DocsContributors contributors={contributors} title={dict.documentContributorsTitle} />
      )}
      <div className="order-last mt-16 border-t border-fd-border pt-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg glass-chip text-fd-accent-foreground">
            <MessageSquareText size={18} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-fd-foreground">{dict.communityTitle}</h3>
            <p className="text-sm text-fd-muted-foreground">{dict.communityDesc}</p>
          </div>
        </div>
        <Guestbook slugKey={slugKey} />
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
