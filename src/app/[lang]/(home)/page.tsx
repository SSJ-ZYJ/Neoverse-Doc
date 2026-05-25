// Locale home page: renders brand entry plus a single "Enter Docs" CTA,
// all copy resolved from the per-locale dictionary.
// 多语言首页：渲染品牌入口与「进入文档」按钮，文案全部从对应语言字典中取。

import Link from 'next/link';
import { getPageDictionary } from '@/dictionaries';
import { i18n, type Locale } from '@/lib/i18n';

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = (lang as Locale) ?? i18n.defaultLanguage;
  const dict = getPageDictionary(locale);

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-sky-400 opacity-20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-green-400 opacity-20 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 text-center space-y-6">
        <h1 className="text-6xl md:text-8xl font-black font-orbitron tracking-widest">
          Neoverse-Doc
        </h1>
        <p className="text-xl md:text-2xl text-foreground/80 max-w-2xl mx-auto font-light">
          {dict.tagline}
        </p>
      </div>

      <Link
        href={`/${locale}/docs/ch0`}
        className="z-10 mt-16 glass-cta px-12 py-4 rounded-2xl text-lg font-semibold hover:scale-105 transition-transform duration-300"
      >
        {dict.enterDocs} →
      </Link>
    </main>
  );
}
