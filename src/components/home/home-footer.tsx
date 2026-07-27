// Homepage-only footer with project repository, Git metadata, and author links.
// 仅用于项目主页的 footer，展示项目仓库、Git 元信息与作者链接。

import { getPageDictionary } from '@/dictionaries';
import { getGitInfo } from '@/lib/git-info';
import type { Locale } from '@/lib/i18n';
import {
  AUTHOR_GITHUB_URL,
  AUTHOR_NAME,
  CO_AUTHOR_GITHUB_URL,
  CO_AUTHOR_NAME,
  PROJECT_START_YEAR,
  REPO_URL,
} from '@/lib/site-config';

interface HomeFooterProps {
  locale: Locale;
}

function formatCopyrightYears(currentYear: number): string {
  return currentYear === PROJECT_START_YEAR
    ? String(PROJECT_START_YEAR)
    : `${PROJECT_START_YEAR}-${currentYear}`;
}

function formatCommitDate(commitDateIso: string | null, fallback: string): string {
  if (!commitDateIso) return fallback;

  const date = new Date(commitDateIso);
  if (Number.isNaN(date.getTime())) return fallback;

  return commitDateIso.slice(0, 19).replace('T', ' ');
}

export function HomeFooter({ locale }: HomeFooterProps) {
  const dict = getPageDictionary(locale);
  const gitInfo = getGitInfo();
  const currentYear = new Date().getFullYear();
  const years = formatCopyrightYears(currentYear);
  const commitDate = formatCommitDate(gitInfo.commitDateIso, dict.homeFooterUnavailable);
  const commitHref = gitInfo.commitId ? `${REPO_URL}/commit/${gitInfo.commitId}` : REPO_URL;

  return (
    <footer className="home-footer">
      <span className="sr-only">{dict.homeFooterLabel}</span>
      <div className="home-footer__inner">
        {/* Reference-style footer rows mirror compact centered project metadata.
            参考图样式的 footer 信息行：紧凑居中展示项目元信息。 */}
        <p className="home-footer__row">
          <span aria-hidden="true">© </span>
          <span>{years} </span>
          <a
            className="home-footer__link"
            href={AUTHOR_GITHUB_URL}
            rel="noreferrer"
            target="_blank"
          >
            {AUTHOR_NAME}
          </a>
          <span> &amp; </span>
          <a
            className="home-footer__link"
            href={CO_AUTHOR_GITHUB_URL}
            rel="noreferrer"
            target="_blank"
          >
            {CO_AUTHOR_NAME}
          </a>
        </p>
        <p className="home-footer__row">
          <span>{dict.homeFooterCode} </span>
          <a className="home-footer__link" href={REPO_URL} rel="noreferrer" target="_blank">
            {dict.homeFooterOpenSource}
          </a>
          <span> (</span>
          <a
            className="home-footer__link home-footer__commit"
            href={commitHref}
            rel="noreferrer"
            target="_blank"
          >
            {gitInfo.commitId ?? dict.homeFooterUnavailable}
          </a>
          <span> @ </span>
          {gitInfo.commitDateIso ? (
            <time dateTime={gitInfo.commitDateIso}>{commitDate}</time>
          ) : (
            commitDate
          )}
          <span>)</span>
        </p>
      </div>
    </footer>
  );
}
