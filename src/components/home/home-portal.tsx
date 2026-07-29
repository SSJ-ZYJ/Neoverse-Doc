// Multi-section homepage portal guides computing students through real
// documentation chapters, learning routes, and contribution entry points.
// 多区段首页门户：引导计算机相关专业学生探索真实章节、学习路径与共建入口。

import { ArrowDown, Code2, MessageSquareText } from 'lucide-react';
import { AnimatedContent } from '@/components/react-bits/animated-content';
import { LightRays } from '@/components/react-bits/light-rays';
import { TransitionLink } from '@/components/transition/transition-link';
import type { Dictionary } from '@/dictionaries';
import type { HomeChapter } from '@/lib/home-sections';
import type { Locale } from '@/lib/i18n';
import { REPO_URL } from '@/lib/site-config';
import { AiComputeBackdrop } from './ai-compute-backdrop';
import { AmbientMotionController } from './ambient-motion-controller';
import { ChapterGrid } from './chapter-grid';
import { HeroTitle } from './hero-title';
import { PrimaryAction } from './primary-action';

interface HomePortalProps {
  chapters: HomeChapter[];
  dict: Dictionary;
  locale: Locale;
}

export function HomePortal({ chapters, dict, locale }: HomePortalProps) {
  const docsHref = chapters[0]?.href ?? `/${locale}/docs/ch0`;

  return (
    <AmbientMotionController>
      <section className="home-hero" aria-labelledby="home-title">
        <LightRays />
        <div className="home-hero__network" aria-hidden="true" />
        <div className="home-hero__content">
          <p className="home-eyebrow">{dict.home.eyebrow}</p>
          <HeroTitle id="home-title" />
          <p className="home-hero__description">{dict.home.heroDescription}</p>
          <div className="home-hero__actions">
            <PrimaryAction href={docsHref} label={dict.enterDocs} />
          </div>
        </div>
        <a className="home-scroll-cue" href="#chapters" data-transition="none">
          <span>{dict.home.scrollHint}</span>
          <ArrowDown aria-hidden="true" size={16} />
        </a>
      </section>

      <section
        className="home-section home-chapters"
        id="chapters"
        aria-labelledby="chapters-title"
      >
        <AiComputeBackdrop variant="knowledge" />
        <AnimatedContent className="home-section__reveal">
          <div className="home-section__heading">
            <p className="home-eyebrow">{dict.home.chaptersEyebrow}</p>
            <h2 id="chapters-title">{dict.home.chaptersTitle}</h2>
            <p>{dict.home.chaptersDescription}</p>
          </div>
          <ChapterGrid actionLabel={dict.home.chapterAction} chapters={chapters} />
        </AnimatedContent>
      </section>

      <section className="home-section home-community" aria-labelledby="community-title">
        <AiComputeBackdrop variant="community" />
        <AnimatedContent className="home-community__layout home-section__reveal">
          <div>
            <p className="home-eyebrow">{dict.home.communityEyebrow}</p>
            <h2 id="community-title">{dict.home.communityTitle}</h2>
            <p>{dict.home.communityDescription}</p>
          </div>
          <div className="home-community__actions">
            <a
              className="control-surface control-surface--primary"
              href={`${REPO_URL}/blob/main/CONTRIBUTING.MD`}
              rel="noreferrer"
              target="_blank"
            >
              <Code2 aria-hidden="true" size={17} />
              {dict.home.communityPrimaryAction}
            </a>
            <TransitionLink
              className="control-surface"
              href={`/${locale}/guestbook`}
              transition="surface"
            >
              <MessageSquareText aria-hidden="true" size={17} />
              {dict.home.communitySecondaryAction}
            </TransitionLink>
          </div>
        </AnimatedContent>
      </section>
    </AmbientMotionController>
  );
}
