// Locale home page: assembles the primary product entries from projections and
// resolves all user-visible copy from the per-locale dictionary.
// 多语言首页：从产品投影组装主入口，所有用户可见文案均来自对应语言字典。

import type { HomeKnowledgeEntry } from '@/components/home/home-entry-grid';
import { HomeFooter } from '@/components/home/home-footer';
import { HomeParticleScroll } from '@/components/home/home-particle-scroll';
import { HomePortal } from '@/components/home/home-portal';
import { JsonLd } from '@/components/seo/json-ld';
import { getHomeChapters } from '@/content/home-sections';
import {
  getExploreProjection,
  getLearnProjection,
  getReferenceProjection,
} from '@/content/projections';
import { createWebSiteJsonLd } from '@/content/seo';
import { CONTENT_TYPE_REGISTRY } from '@/content/taxonomy';
import { getPageDictionary } from '@/dictionaries';
import { generateLocaleStaticParams, LANGUAGE_TAGS, resolveLocale } from '@/lib/i18n';

export const generateStaticParams = generateLocaleStaticParams;

function getReferenceType() {
  const referenceType = CONTENT_TYPE_REGISTRY.find((entry) => entry.id === 'reference');
  if (!referenceType) throw new Error('Reference content type is missing from the taxonomy.');
  return referenceType;
}

function createHomeKnowledgeEntries(
  locale: ReturnType<typeof resolveLocale>,
  dict: ReturnType<typeof getPageDictionary>,
): readonly HomeKnowledgeEntry[] {
  const learn = getLearnProjection(locale);
  const explore = getExploreProjection(locale);
  const reference = getReferenceProjection(locale);
  const referenceType = getReferenceType();
  const learnStepCount = learn.tracks.reduce((total, track) => total + track.steps.length, 0);

  return [
    {
      id: 'learn',
      title: dict.home.learnEntryTitle,
      description: dict.learn.description,
      href: `/${locale}/learn`,
      meta: `${learn.tracks.length} ${dict.home.learnTrackCount} · ${learnStepCount} ${dict.home.learnStepCount}`,
    },
    {
      id: 'topics',
      title: dict.home.topicsEntryTitle,
      description: dict.topics.description,
      href: `/${locale}/topics`,
      meta: `${explore.topics.length} ${dict.home.topicCount}`,
    },
    {
      id: 'reference',
      title: dict.home.referenceEntryTitle,
      description: referenceType.description?.[locale] ?? dict.reference.noContentDescription,
      href: `/${locale}/reference`,
      meta: `${reference.contentIds.length} ${dict.home.referenceCount}`,
    },
  ];
}

export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);
  const chapters = getHomeChapters(locale);
  const entries = createHomeKnowledgeEntries(locale, dict);

  return (
    <>
      <JsonLd id="website-json-ld" data={createWebSiteJsonLd(locale)} />
      <HomeParticleScroll>
        {/* Keep the complete homepage surface inside the HTML-in-Canvas subtree so
            its ambient background is captured together with the foreground content.
            将完整首页表面置于 HTML-in-Canvas 子树内，使环境背景与前景内容一同捕获。 */}
        <main className="home-page" lang={LANGUAGE_TAGS[locale]}>
          {/* The portal component keeps page structure semantic and effects encapsulated.
              门户组件保持页面结构语义化，并封装底层效果。 */}
          <HomePortal chapters={chapters} dict={dict} entries={entries} locale={locale} />

          {/* Homepage footer with repository, Git commit, and author metadata.
              首页底部信息，展示仓库、Git 提交与作者元信息。 */}
          <HomeFooter locale={locale} />
        </main>
      </HomeParticleScroll>
    </>
  );
}
