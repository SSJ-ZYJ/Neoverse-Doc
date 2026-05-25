// Locale home page: renders brand entry plus a single "Enter Docs" CTA,
// all copy resolved from the per-locale dictionary.
// 多语言首页：渲染品牌入口与「进入文档」按钮，文案全部从对应语言字典中取。

import EnterDocsButton from '@/components/enter-docs-button';
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
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Animated gradient background for the homepage only. / 首页动态渐变背景，仅作用于当前页面。 */}
      <div aria-hidden="true" className="home-gradient-bg pointer-events-none absolute inset-0">
        <div className="home-gradient-bg__orb home-gradient-bg__orb--one" />
        <div className="home-gradient-bg__orb home-gradient-bg__orb--two" />
        <div className="home-gradient-bg__orb home-gradient-bg__orb--three" />
      </div>

      <div className="relative z-10 space-y-6 text-center">
        <h1 className="text-6xl md:text-8xl font-black font-orbitron tracking-widest">
          Neoverse-Doc
        </h1>
        <p className="text-xl md:text-2xl text-foreground/80 max-w-2xl mx-auto font-light">
          {dict.tagline}
        </p>
      </div>

      <EnterDocsButton
        href={`/${locale}/docs/ch0`}
        className="z-10 mt-16 glass-cta px-12 py-4 rounded-2xl text-lg font-semibold hover:scale-105 transition-transform duration-300"
      >
        {dict.enterDocs} →
      </EnterDocsButton>

      <style>{`
        .home-gradient-bg {
          background:
            radial-gradient(circle at 18% 18%, rgba(56, 189, 248, 0.35), transparent 38%),
            radial-gradient(circle at 82% 22%, rgba(74, 222, 128, 0.32), transparent 36%),
            radial-gradient(circle at 50% 82%, rgba(14, 165, 233, 0.25), transparent 42%),
            linear-gradient(120deg, rgba(243, 249, 255, 0.98), rgba(236, 253, 245, 0.95));
          background-size: 180% 180%, 180% 180%, 160% 160%, 100% 100%;
          animation: home-gradient-drift 8s cubic-bezier(0.25, 0.1, 0.25, 1) infinite alternate;
        }

        .home-gradient-bg__orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(120px);
          opacity: 0.65;
          mix-blend-mode: screen;
          transform: translate3d(0, 0, 0);
          will-change: transform, opacity;
          animation:
            home-orb-float 5s cubic-bezier(0.25, 0.1, 0.25, 1) infinite,
            home-orb-pulse 4s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
        }

        .home-gradient-bg__orb--one {
          top: -12%;
          left: -8%;
          width: 26rem;
          height: 26rem;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.7), transparent 70%);
          animation-delay: 0s, -2s;
        }

        .home-gradient-bg__orb--two {
          top: 8%;
          right: -10%;
          width: 30rem;
          height: 30rem;
          background: radial-gradient(circle, rgba(74, 222, 128, 0.62), transparent 68%);
          animation-delay: -6s, -4s;
        }

        .home-gradient-bg__orb--three {
          bottom: -16%;
          left: 28%;
          width: 28rem;
          height: 28rem;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.58), transparent 72%);
          animation-delay: -10s, -6s;
        }

        [data-theme='dark'] .home-gradient-bg,
        .dark .home-gradient-bg {
          background:
            radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.38), transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(74, 222, 128, 0.34), transparent 36%),
            radial-gradient(circle at 50% 85%, rgba(14, 165, 233, 0.28), transparent 44%),
            linear-gradient(120deg, rgba(8, 15, 32, 0.94), rgba(5, 9, 19, 0.98));
          background-size: 180% 180%, 180% 180%, 160% 160%, 100% 100%;
          animation: home-gradient-drift 8s cubic-bezier(0.25, 0.1, 0.25, 1) infinite alternate;
        }

        [data-theme='dark'] .home-gradient-bg__orb--one,
        .dark .home-gradient-bg__orb--one {
          background: radial-gradient(circle, rgba(56, 189, 248, 0.92), transparent 70%);
        }

        [data-theme='dark'] .home-gradient-bg__orb--two,
        .dark .home-gradient-bg__orb--two {
          background: radial-gradient(circle, rgba(74, 222, 128, 0.85), transparent 68%);
        }

        [data-theme='dark'] .home-gradient-bg__orb--three,
        .dark .home-gradient-bg__orb--three {
          background: radial-gradient(circle, rgba(14, 165, 233, 0.82), transparent 72%);
        }

        @keyframes home-gradient-drift {
          0% {
            background-position:
              0% 50%,
              100% 0%,
              50% 100%,
              0% 0%;
          }

          50% {
            background-position:
              100% 40%,
              0% 60%,
              60% 0%,
              0% 0%;
          }

          100% {
            background-position:
              0% 50%,
              100% 0%,
              50% 100%,
              0% 0%;
          }
        }

        @keyframes home-orb-float {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }

          50% {
            transform: translate3d(0, 0.75rem, 0) scale(1.04);
          }
        }

        @keyframes home-orb-pulse {
          0%,
          100% {
            opacity: 0.48;
          }

          50% {
            opacity: 0.65;
          }
        }
      `}</style>
    </main>
  );
}
