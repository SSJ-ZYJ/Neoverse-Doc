// Locale home page: renders brand entry plus a single "Enter Docs" CTA,
// all copy resolved from the per-locale dictionary.
// 多语言首页：渲染品牌入口与「进入文档」按钮，文案全部从对应语言字典中取。

import { HomeFooter } from '@/components/home/home-footer';
import { HomeParticleScroll } from '@/components/home/home-particle-scroll';
import { HomePortal } from '@/components/home/home-portal';
import { JsonLd } from '@/components/seo/json-ld';
import { getHomeChapters } from '@/content/home-sections';
import { createWebSiteJsonLd } from '@/content/seo';
import { getPageDictionary } from '@/dictionaries';
import { generateLocaleStaticParams, LANGUAGE_TAGS, resolveLocale } from '@/lib/i18n';

export const generateStaticParams = generateLocaleStaticParams;

export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);
  const chapters = getHomeChapters(locale);

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
          <HomePortal chapters={chapters} dict={dict} locale={locale} />

          {/* Homepage footer with repository, Git commit, and author metadata.
              首页底部信息，展示仓库、Git 提交与作者元信息。 */}
          <HomeFooter locale={locale} />
        </main>
      </HomeParticleScroll>
    </>
  );
}
