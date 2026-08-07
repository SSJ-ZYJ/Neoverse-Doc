// Dynamic doc page: renders MDX content from the fumadocs source tree with
// Mermaid support and a Giscus discussion section at the bottom.
// Metadata (title / description) is generated from page frontmatter.
// 动态文档页：从 fumadocs source 树渲染 MDX 内容，支持 Mermaid 图表，
// 底部附带 Giscus 讨论区。元信息（标题/描述）从页面 frontmatter 生成。

import { findNeighbour } from 'fumadocs-core/page-tree';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsCommunity } from '@/components/docs-community';
import { DocsDraftControls } from '@/components/docs-draft-controls';
import { DocsPageActions } from '@/components/docs-page-actions';
import { getMdxComponents } from '@/components/mdx';
import { DocsAuthor, DocsContributors } from '@/components/mdx/docs-author';
import { TaskListProgress } from '@/components/mdx/task-list-progress';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';
import { REPO_URL } from '@/lib/site-config';
import { source } from '@/lib/source';

export default async function Page(props: PageProps<'/[lang]/docs/[...slug]'>) {
  const { slug, lang } = await props.params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);
  const page = source.getPage(slug, locale);
  if (!page) notFound();

  const MDX = page.data.body;
  const slugKey = slug.join('/');
  const sourcePath = page.data.info.fullPath;
  const markdownUrl = `/${locale}/docs-source/${slugKey}.md`;
  const githubUrl = `${REPO_URL}/blob/main/${sourcePath}`;
  // Contributor frontmatter supports both singular and plural keys.
  // 贡献者 frontmatter 同时兼容单数与复数字段。
  const contributors = page.data.contributors ?? page.data.contributor;
  const header = (
    <>
      {/* Stable title metadata lets the client-side reading return action name its source page.
          稳定的标题元数据让客户端阅读返回操作能够标明来源文章。 */}
      <DocsTitle data-docs-title="">{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {/* Author and page actions share one baseline: author on the left, actions
           right-aligned beside it.
           作者与页面操作共用一行基线：作者在左，操作弹层右对齐。 */}
      <div className="docs-page-meta">
        {page.data.author && (
          <DocsAuthor author={page.data.author} label={dict.primaryAuthorLabel} />
        )}
        <DocsPageActions githubUrl={githubUrl} markdownUrl={markdownUrl} />
      </div>
    </>
  );
  const content = (
    <>
      {/* Frontmatter opts individual documents into the persisted GFM task summary.
          由 frontmatter 决定单篇文档是否显示持久化 GFM 任务进度。 */}
      {page.data.todoProgress && <TaskListProgress />}
      {/* Stable body hook lets CSS defer only expensive off-screen MDX blocks.
          稳定的正文标记让 CSS 仅延迟绘制离屏的高成本 MDX 内容块。 */}
      <DocsBody data-docs-body="" tabIndex={page.data.draft ? -1 : undefined}>
        {/* Shared registry centralizes server/client boundaries for every MDX document.
            共享注册表集中管理所有 MDX 文档的服务端与客户端边界。 */}
        <MDX components={getMdxComponents()} />
      </DocsBody>
      {contributors && (
        <DocsContributors contributors={contributors} title={dict.documentContributorsTitle} />
      )}
    </>
  );
  const community = (
    <DocsCommunity description={dict.communityDesc} slugKey={slugKey} title={dict.communityTitle} />
  );
  const previous = page.data.draft
    ? findNeighbour(source.pageTree[locale], page.url, { separateRoot: false }).previous
    : undefined;
  const pageContent = page.data.draft ? (
    <div className="docs-draft" data-docs-draft="" data-state="locked">
      <div className="docs-draft__content" aria-hidden="true" inert>
        {content}
      </div>
      <DocsDraftControls
        badge={dict.draftBadge}
        description={dict.draftDescription}
        previousHref={previous?.url ?? `/${locale}`}
        previousLabel={previous ? dict.draftPrevious : dict.draftHome}
        revealAction={dict.draftReveal}
        title={dict.draftTitle}
        unlockedAnnouncement={dict.draftUnlocked}
      />
    </div>
  ) : (
    content
  );

  // Use default TOC style which includes a scroll-tracking thumb that moves
  // along the SVG path. The clerk style has no thumb element.
  // 使用 default TOC 风格，内置沿 SVG 路径移动的滚动追踪指示点。clerk 风格没有 thumb 元素。
  return (
    <>
      <DocsPage
        toc={page.data.toc}
        full={page.data.full}
        footer={page.data.draft ? { className: 'docs-draft__footer' } : undefined}
        tableOfContent={{ style: 'normal' }}
      >
        {header}
        {pageContent}
      </DocsPage>
      {/* Keep community height and scrolling outside the Fumadocs article container.
          将社区模块的高度与滚动隔离在 Fumadocs 正文容器之外。 */}
      {community}
    </>
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
