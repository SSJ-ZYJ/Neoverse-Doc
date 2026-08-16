import { ArrowLeft, ArrowRight, BookOpen, GitBranch, Route } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ContentStatus } from '@/content/maintenance';
import { contentProjectionSources, getLearnProjection } from '@/content/projections';
import type { ContentTrack } from '@/content/taxonomy';
import { CONTENT_TRACK_REGISTRY } from '@/content/taxonomy';
import type { Dictionary } from '@/dictionaries';
import { TransitionLink } from '@/features/transition';
import { LANGUAGE_TAGS, type Locale } from '@/lib/i18n';
import { LearnTrackStepList } from './learn-track-step-list';

export type LearnCopy = Dictionary['learn'];

export interface LearnTrackView {
  readonly id: ContentTrack;
  readonly label: string;
  readonly description?: string;
  readonly href: string;
  readonly backHref: string;
  readonly stepCount: number;
}

export interface LearnPrerequisiteView {
  readonly id: string;
  readonly title: string;
  readonly href?: string;
  readonly isInTrack: boolean;
  readonly replacement?: {
    readonly title: string;
    readonly href: string;
  };
}

export interface LearnStepView {
  readonly contentId: string;
  readonly number: number;
  readonly title: string;
  readonly description?: string;
  readonly href: string;
  readonly status: ContentStatus;
  readonly estimatedMinutes?: number;
  readonly prerequisites: readonly LearnPrerequisiteView[];
}

export function LearnLandingPage({
  copy,
  tracks,
}: {
  copy: LearnCopy;
  tracks: readonly LearnTrackView[];
}) {
  return (
    <>
      <header className="page-header">
        <p className="page-header__eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="page-header__description">{copy.description}</p>
      </header>

      {tracks.length > 0 ? (
        <section aria-labelledby="learn-available-tracks" className="page-section">
          <div className="page-section__heading">
            <div>
              <p className="page-section__eyebrow">{copy.eyebrow}</p>
              <h2 id="learn-available-tracks">{copy.availableTracks}</h2>
            </div>
            <div aria-hidden="true" className="page-section__icon">
              <Route size={24} />
            </div>
          </div>
          <div className="content-grid">
            {tracks.map((track) => (
              <TransitionLink
                className="learn-track-card glass-card glass-interactive"
                data-card="true"
                data-nd-interaction="control"
                href={track.href}
                key={track.id}
              >
                <span className="learn-track-card__topline">
                  <span className="learn-track-card__icon" aria-hidden="true">
                    <BookOpen size={18} />
                  </span>
                  <ArrowRight aria-hidden="true" size={18} />
                </span>
                <span className="learn-track-card__content">
                  <strong>{track.label}</strong>
                  {track.description && <span>{track.description}</span>}
                </span>
                <span className="learn-track-card__footer">
                  <span className="metadata-chip metadata-chip--track">
                    {track.stepCount} {copy.stepsLabel}
                  </span>
                  <span>{copy.viewTrack}</span>
                </span>
              </TransitionLink>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state glass-card" data-card="true">
          <div aria-hidden="true" className="empty-state__icon">
            <Route size={24} />
          </div>
          <h2>{copy.noTracksTitle}</h2>
          <p>{copy.noTracksDescription}</p>
        </div>
      )}
    </>
  );
}

export function LearnTrackPage({
  copy,
  steps,
  track,
  validContentIds,
}: {
  copy: LearnCopy;
  steps: readonly LearnStepView[];
  track: LearnTrackView;
  validContentIds: readonly string[];
}) {
  return (
    <>
      <header className="page-header page-header--detail">
        <TransitionLink className="page-header__back-link" href={track.backHref}>
          <ArrowLeft aria-hidden="true" size={16} />
          {copy.returnToLearn}
        </TransitionLink>
        <p className="page-header__eyebrow">{copy.eyebrow}</p>
        <h1>{track.label}</h1>
        {track.description && <p className="page-header__description">{track.description}</p>}
        <div className="page-header__actions">
          <div className="learn-track-summary glass-card" data-card="true">
            <span className="learn-track-summary__item">
              <strong>{track.stepCount}</strong>
              <span>{copy.stepsLabel}</span>
            </span>
            <span className="learn-track-summary__divider" aria-hidden="true" />
            <span className="learn-track-summary__item">
              <GitBranch aria-hidden="true" size={17} />
              <span>{copy.orderLabel}</span>
            </span>
          </div>
        </div>
      </header>

      <section aria-labelledby="learn-track-order" className="page-section">
        <div className="page-section__heading">
          <div>
            <p className="page-section__eyebrow">{copy.eyebrow}</p>
            <h2 id="learn-track-order">{copy.orderLabel}</h2>
            <p className="page-section__description">{copy.orderDescription}</p>
          </div>
          <div aria-hidden="true" className="page-section__icon">
            <GitBranch size={24} />
          </div>
        </div>

        <LearnTrackStepList copy={copy} steps={steps} validContentIds={validContentIds} />
      </section>
    </>
  );
}

export function LearnDocNavigation({
  contentId,
  copy,
  locale,
}: {
  contentId: string;
  copy: LearnCopy;
  locale: Locale;
}) {
  const manifestById = new Map(
    contentProjectionSources.manifest
      .filter((entry) => entry.locale === locale)
      .map((entry) => [entry.id, entry] as const),
  );
  const projection = getLearnProjection(locale);
  const items = projection.tracks.flatMap((track) => {
    const currentIndex = track.steps.findIndex((step) => step.contentId === contentId);
    const trackEntry = CONTENT_TRACK_REGISTRY.find((entry) => entry.id === track.trackId);
    if (currentIndex < 0 || !trackEntry || !manifestById.has(contentId)) return [];

    const previousEntry = track.steps[currentIndex - 1]
      ? manifestById.get(track.steps[currentIndex - 1].contentId)
      : undefined;
    const nextEntry = track.steps[currentIndex + 1]
      ? manifestById.get(track.steps[currentIndex + 1].contentId)
      : undefined;

    return [
      {
        id: track.trackId,
        label: trackEntry.label[locale],
        href: `/${locale}/learn/${track.trackId}`,
        previous: previousEntry
          ? { title: previousEntry.title, href: previousEntry.url }
          : undefined,
        next: nextEntry ? { title: nextEntry.title, href: nextEntry.url } : undefined,
      },
    ];
  });

  if (items.length === 0) return null;

  return (
    <nav aria-label={copy.trackNavigationLabel} className="learn-doc-navigation">
      {items.map((item) => (
        <div className="learn-doc-navigation__track" key={item.id}>
          <div className="learn-doc-navigation__heading">
            <span className="learn-doc-navigation__icon" aria-hidden="true">
              <Route size={17} />
            </span>
            <div>
              <span>{copy.belongsToTrack}</span>
              <TransitionLink href={item.href}>{item.label}</TransitionLink>
            </div>
          </div>
          <div className="learn-doc-navigation__links">
            <LearnDocNavigationLink
              copy={copy.previousStep}
              emptyLabel={copy.trackStart}
              link={item.previous}
              side="previous"
            />
            <LearnDocNavigationLink
              copy={copy.nextStep}
              emptyLabel={copy.trackEnd}
              link={item.next}
              side="next"
            />
          </div>
        </div>
      ))}
    </nav>
  );
}

function LearnDocNavigationLink({
  copy,
  emptyLabel,
  link,
  side,
}: {
  copy: string;
  emptyLabel: string;
  link?: { title: string; href: string };
  side: 'next' | 'previous';
}) {
  const icon =
    side === 'previous' ? (
      <ArrowLeft aria-hidden="true" size={16} />
    ) : (
      <ArrowRight aria-hidden="true" size={16} />
    );

  if (!link) {
    return (
      <span className="learn-doc-navigation__link learn-doc-navigation__link--disabled">
        {icon}
        <span>
          <small>{copy}</small>
          <strong>{emptyLabel}</strong>
        </span>
      </span>
    );
  }

  return (
    <TransitionLink className="learn-doc-navigation__link" href={link.href}>
      {side === 'previous' && icon}
      <span>
        <small>{copy}</small>
        <strong>{link.title}</strong>
      </span>
      {side === 'next' && icon}
    </TransitionLink>
  );
}

export function LearnPageShell({ children, locale }: { children: ReactNode; locale: Locale }) {
  return (
    <main className="knowledge-page learn-page" lang={LANGUAGE_TAGS[locale]}>
      <div className="knowledge-page__inner">{children}</div>
    </main>
  );
}
