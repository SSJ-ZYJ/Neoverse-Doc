// Locale home page: renders brand entry plus a single "Enter Docs" CTA,
// all copy resolved from the per-locale dictionary.
// 多语言首页：渲染品牌入口与「进入文档」按钮，文案全部从对应语言字典中取。

import { HomeFooter } from '@/components/home-footer';
import EnterDocsButton from '@/components/transition/enter-docs-button';
import { getPageDictionary } from '@/dictionaries';
import { generateLocaleStaticParams, resolveLocale } from '@/lib/i18n';

export const generateStaticParams = generateLocaleStaticParams;

export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);

  return (
    <main className="home-page">
      {/* Animated gradient background for the homepage only. / 首页动态渐变背景，仅作用于当前页面。 */}
      <div aria-hidden="true" className="home-gradient-bg pointer-events-none absolute inset-0">
        <div className="home-gradient-bg__orb home-gradient-bg__orb--one" />
        <div className="home-gradient-bg__orb home-gradient-bg__orb--two" />
        <div className="home-gradient-bg__orb home-gradient-bg__orb--three" />
      </div>

      {/* First-screen hero keeps the footer below the fold.
          首屏 hero 将 footer 留在折叠线以下，需向下滚动查看。 */}
      <section className="home-page__hero">
        <div className="space-y-6 text-center">
          <h1 className="text-6xl md:text-8xl font-black font-orbitron tracking-widest">
            Neoverse-Doc
          </h1>
          <p className="text-xl md:text-2xl text-fd-foreground/80 max-w-2xl mx-auto font-light">
            {dict.tagline}
          </p>
        </div>

        <EnterDocsButton
          href={`/${locale}/docs/ch0`}
          className="mt-16 glass-cta px-12 py-4 rounded-2xl text-lg font-semibold"
        >
          {dict.enterDocs} →
        </EnterDocsButton>
      </section>

      {/* Homepage footer with repository, Git commit, and author metadata.
          首页底部信息，展示仓库、Git 提交与作者元信息。 */}
      <HomeFooter locale={locale} />
    </main>
  );
}
