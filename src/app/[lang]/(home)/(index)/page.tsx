// Locale home page: renders brand entry plus a single "Enter Docs" CTA,
// all copy resolved from the per-locale dictionary.
// 多语言首页：渲染品牌入口与「进入文档」按钮，文案全部从对应语言字典中取。

import { HomeFooter } from '@/components/home/home-footer';
import { HomeParticleScroll } from '@/components/home/home-particle-scroll';
import { HomePortal } from '@/components/home/home-portal';
import { getPageDictionary } from '@/dictionaries';
import { getHomeChapters } from '@/lib/home-sections';
import { generateLocaleStaticParams, resolveLocale } from '@/lib/i18n';

export const generateStaticParams = generateLocaleStaticParams;

export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);
  const chapters = getHomeChapters(locale);

  return (
    <main className="home-page">
      {/* Particle scroll is deliberately scoped to the homepage. Docs pages
          keep normal document scrolling and use particles only during article navigation.
          粒子滚动严格限定在主页；文档页保持普通滚动，仅在文章切换时使用粒子。 */}
      <HomeParticleScroll>
        {/* The portal component keeps page structure semantic and effects encapsulated.
            门户组件保持页面结构语义化，并封装底层效果。 */}
        <HomePortal chapters={chapters} dict={dict} locale={locale} />

        {/* Homepage footer with repository, Git commit, and author metadata.
            首页底部信息，展示仓库、Git 提交与作者元信息。 */}
        <HomeFooter locale={locale} />
      </HomeParticleScroll>
    </main>
  );
}
