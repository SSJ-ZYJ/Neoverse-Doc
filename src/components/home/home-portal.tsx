// Multi-section homepage portal starts with product entries, then keeps the
// authoring Chapter tree and contribution links as secondary destinations.
// 多区段首页门户先呈现产品入口，再把作者编排的章节树与共建入口置于次级层。

import { ArrowDown, Code2, MessageSquareText } from 'lucide-react';
import { AnimatedContent } from '@/components/react-bits/animated-content';
import { LightRays } from '@/components/react-bits/light-rays';
import type { HomeChapter } from '@/content/home-sections';
import type { ContinueLearningCatalog } from '@/content/projections';
import type { Dictionary } from '@/dictionaries';
import { TransitionLink } from '@/features/transition';
import type { Locale } from '@/lib/i18n';
import { REPO_URL } from '@/lib/site-config';
import { AiComputeBackdrop } from './ai-compute-backdrop';
import { AmbientMotionController } from './ambient-motion-controller';
import { ChapterGrid } from './chapter-grid';
import { ContinueLearningCard } from './continue-learning-card';
import { HeroTitle } from './hero-title';
import { HomeEntryGrid, type HomeKnowledgeEntry } from './home-entry-grid';
import { PrimaryAction } from './primary-action';

interface HomePortalProps {
  chapters: HomeChapter[];
  continueLearningCatalog: ContinueLearningCatalog;
  dict: Dictionary;
  entries: readonly HomeKnowledgeEntry[];
  locale: Locale;
}

export function HomePortal({
  chapters,
  continueLearningCatalog,
  dict,
  entries,
  locale,
}: HomePortalProps) {
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
            <PrimaryAction href={`/${locale}/learn`} label={dict.home.primaryAction} />
          </div>
        </div>
        <a className="home-scroll-cue" href="#knowledge-entries" data-transition="none">
          <span>{dict.home.scrollHint}</span>
          <ArrowDown aria-hidden="true" size={16} />
        </a>
      </section>

      <section
        className="home-section home-knowledge"
        id="knowledge-entries"
        aria-labelledby="knowledge-entries-title"
      >
        <AiComputeBackdrop variant="knowledge" />
        <AnimatedContent className="home-section__reveal">
          <div className="home-section__heading">
            <p className="home-eyebrow">{dict.home.entriesEyebrow}</p>
            <h2 id="knowledge-entries-title">{dict.home.entriesTitle}</h2>
            <p>{dict.home.entriesDescription}</p>
          </div>
          <ContinueLearningCard catalog={continueLearningCatalog} copy={dict.home} />
          <HomeEntryGrid entries={entries} />
        </AnimatedContent>
      </section>

      <section
        className="home-section home-chapters"
        id="chapters"
        aria-labelledby="chapters-title"
      >
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
              data-nd-interaction="control"
              href={`${REPO_URL}/blob/main/CONTRIBUTING.MD`}
              rel="noreferrer"
              target="_blank"
            >
              <Code2 aria-hidden="true" size={17} />
              {dict.home.communityPrimaryAction}
            </a>
            <TransitionLink
              className="control-surface"
              data-nd-interaction="control"
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
