// Dynamic doc page: renders MDX content from the fumadocs source tree with
// Mermaid support and a Giscus discussion section at the bottom.
// Metadata (title / description) is generated from page frontmatter.
// 动态文档页：从 fumadocs source 树渲染 MDX 内容，支持 Mermaid 图表，
// 底部附带 Giscus 讨论区。元信息（标题/描述）从页面 frontmatter 生成。

import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { MessageSquareText } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Guestbook } from '@/components/guestbook';
import { Tab, Tabs } from '@/components/mdx/code-tabs';
import { CollapsibleDetails } from '@/components/mdx/collapsible-details';
import { CustomCodeBlock } from '@/components/mdx/custom-codeblock';
import {
  DocCard,
  DocGrid,
  FeatureCard,
  LearningPath,
  ResourceLink,
} from '@/components/mdx/doc-cards';
import { DocsAuthor, DocsContributors } from '@/components/mdx/docs-author';
import { Mermaid } from '@/components/mdx/mermaid';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';
import { source } from '@/lib/source';

export default async function Page(props: PageProps<'/[lang]/docs/[...slug]'>) {
  const { slug, lang } = await props.params;
  const locale = resolveLocale(lang);
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
        {/* AI details renderer enables adaptive typewriter reveal for `[!DETAILS-AI]` blocks.
            AI 折叠块渲染器为 `[!DETAILS-AI]` 块启用自适应打字机揭示效果。 */}
        <MDX
          components={{
            ...defaultMdxComponents,
            details: CollapsibleDetails,
            Mermaid,
            pre: CustomCodeBlock,
            Tabs,
            Tab,
            DocCard,
            DocGrid,
            FeatureCard,
            LearningPath,
            ResourceLink,
          }}
        />
      </DocsBody>
      {contributors && (
        <DocsContributors contributors={contributors} title={dict.documentContributorsTitle} />
      )}
      <div className="order-last mt-16 border-t border-fd-border pt-10">
        {/* Community heading uses stable classes so icon/text alignment and the
            compact project radius stay independent from Markdown heading rules.
            讨论区标题使用稳定类名，避免图标/文字对齐与圆角受 Markdown 标题规则影响。 */}
        <div className="docs-community__header mb-6 flex gap-3">
          <div className="docs-community__icon flex size-9 items-center justify-center glass-chip text-fd-accent-foreground">
            <MessageSquareText size={18} />
          </div>
          <div className="docs-community__copy">
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
  const locale = resolveLocale(lang);
  const page = source.getPage(slug, locale);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
