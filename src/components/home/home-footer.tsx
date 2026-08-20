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
  CODE_LICENSE_NAME,
  CODE_LICENSE_URL,
  DOCS_LICENSE_NAME,
  DOCS_LICENSE_URL,
  ICP_FILING_NUMBER,
  ICP_FILING_URL,
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
        <p className="home-footer__row home-footer__row--copyright">
          <span aria-hidden="true">© </span>
          <span>{years} </span>
          {/* Author links form one spaced semantic group instead of relying on
              trailing whitespace between flex items.
              作者链接使用带间距的语义分组，不依赖 flex 子项末尾空格。 */}
          <span className="home-footer__authors">
            <a
              className="home-footer__link"
              href={AUTHOR_GITHUB_URL}
              rel="noreferrer"
              target="_blank"
            >
              {AUTHOR_NAME}
            </a>
            <span aria-hidden="true"> &amp; </span>
            <a
              className="home-footer__link"
              href={CO_AUTHOR_GITHUB_URL}
              rel="noreferrer"
              target="_blank"
            >
              {CO_AUTHOR_NAME}
            </a>
          </span>
        </p>
        <p className="home-footer__row home-footer__row--project">
          <span className="home-footer__project-state">
            <span>{dict.homeFooterCode} </span>
            <a className="home-footer__link" href={REPO_URL} rel="noreferrer" target="_blank">
              {dict.homeFooterOpenSource}{' '}
            </a>
          </span>
          <span className="home-footer__revision">
            <span aria-hidden="true">(</span>
            <a className="home-footer__link" href={commitHref} rel="noreferrer" target="_blank">
              {gitInfo.commitId ?? dict.homeFooterUnavailable}
            </a>
            <span aria-hidden="true">{` @ `}</span>
            {gitInfo.commitDateIso ? (
              <time dateTime={gitInfo.commitDateIso}>{commitDate}</time>
            ) : (
              commitDate
            )}
            <span aria-hidden="true">)</span>
          </span>
        </p>
        {/* Open-source license row: code is MIT, documentation is CC BY-NC-SA 4.0.
            开源协议行：代码遵循 MIT，文档内容遵循 CC BY-NC-SA 4.0。 */}
        <p className="home-footer__row home-footer__row--license">
          <span className="home-footer__license-item">
            <span>{dict.homeFooterCodeLicenseLabel}: </span>
            <a
              className="home-footer__link"
              href={CODE_LICENSE_URL}
              rel="noreferrer"
              target="_blank"
            >
              {CODE_LICENSE_NAME}
            </a>
          </span>
          <span className="home-footer__license-item">
            <span>{dict.homeFooterDocsLicenseLabel}: </span>
            <a
              className="home-footer__link"
              href={DOCS_LICENSE_URL}
              rel="noreferrer"
              target="_blank"
            >
              {DOCS_LICENSE_NAME}
            </a>
          </span>
        </p>
        {/* ICP filing row: legal notice required for Chinese sites, linking to
            the official MIIT record query page.
            备案号行：中国站点法规要求的备案信息，链接至工信部备案查询官网。 */}
        <p className="home-footer__row home-footer__row--icp">
          <span>{dict.homeFooterIcpLabel}: </span>
          <a className="home-footer__link" href={ICP_FILING_URL} rel="noreferrer" target="_blank">
            {ICP_FILING_NUMBER}
          </a>
        </p>
      </div>
    </footer>
  );
}
