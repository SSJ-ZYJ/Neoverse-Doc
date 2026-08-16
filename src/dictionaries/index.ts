// Page dictionary index. The single source of truth for the locale list is
// src/lib/i18n.ts (`defineI18n`); this file only exposes a per-locale lookup
// for application page copy.
// 页面字典入口。语言列表的唯一来源是 src/lib/i18n.ts 的 defineI18n，
// 本文件只暴露针对页面文案的按 locale 查询。

import type { Locale } from '@/lib/i18n';
import { i18n } from '@/lib/i18n';
import { en } from './en';
import { zh } from './zh';

// Compile-time contract every locale dictionary must satisfy.
// Keeping this here (not in zh.ts/en.ts) avoids a circular type-only import.
// 所有语言字典必须满足的编译期契约。
// 放在此处（而非 zh.ts/en.ts）以避免类型循环引用。
export interface Dictionary {
  siteTitle: string;
  tagline: string;
  loading: string;
  // Visual loading marquee label.
  // 可视化加载跑马灯标签。
  loadingMarquee: string;
  learnTitle: string;
  topicsTitle: string;
  // Root language gateway fallback / 根语言分流入口兜底文案
  languageGatewayTitle: string;
  languageGatewayDescription: string;
  languageGatewayAction: string;
  guestbookTitle: string;
  guestbookDesc: string;
  communityTitle: string;
  communityDesc: string;
  primaryAuthorLabel: string;
  documentContributorsTitle: string;
  pageActionsLabel: string;
  // Page actions menu item labels / 页面操作菜单项文案
  pageActionsViewSource: string;
  pageActionsOpenGithub: string;
  backToDocs: string;
  backToHome: string;
  backToTop: string;
  // Motion settings labels / 动效设置文案
  motionSettingsLabel: string;
  motionSettingsDescription: string;
  motionLevelLabel: string;
  motionLevelLow: string;
  motionLevelMedium: string;
  motionLevelHigh: string;
  experimentalMotionLabel: string;
  experimentalMotionDescription: string;
  experimentalMotionUnavailableLow: string;
  experimentalMotionUnavailableUnsupported: string;
  systemReducedMotionNotice: string;
  // Search scope labels / 搜索范围标签
  searchScopeLabel: string;
  searchAllChapters: string;
  // Cross-document reading return labels / 跨文档阅读返回标签
  readingReturnAction: string;
  readingReturnAriaLabel: string;
  readingReturnDismiss: string;
  // Route error recovery copy / 路由错误恢复文案
  errorTitle: string;
  errorCode: string;
  errorDesc: string;
  errorRetry: string;
  notFoundTitle: string;
  notFoundCode: string;
  notFoundDesc: string;
  notFoundBack: string;
  notFoundHome: string;
  notFoundDocs: string;
  // Draft document gate labels / 草稿文档门禁文案
  draftBadge: string;
  draftTitle: string;
  draftDescription: string;
  draftPrevious: string;
  draftHome: string;
  draftReveal: string;
  draftUnlocked: string;
  // Lifecycle notices / 生命周期状态提示
  reviewBadge: string;
  reviewDescription: string;
  deprecatedBadge: string;
  deprecatedDescription: string;
  replacementAction: string;
  learn: {
    eyebrow: string;
    title: string;
    description: string;
    availableTracks: string;
    viewTrack: string;
    stepsLabel: string;
    orderLabel: string;
    orderDescription: string;
    prerequisitesLabel: string;
    noPrerequisites: string;
    outsideTrackPrerequisite: string;
    prerequisiteUnavailable: string;
    replacedBy: string;
    reviewBadge: string;
    returnToLearn: string;
    trackNavigationLabel: string;
    belongsToTrack: string;
    previousStep: string;
    nextStep: string;
    trackStart: string;
    trackEnd: string;
    noTracksTitle: string;
    noTracksDescription: string;
    minutes: string;
  };
  topics: {
    eyebrow: string;
    title: string;
    description: string;
    availableTopics: string;
    viewTopic: string;
    contentCount: string;
    relatedContent: string;
    contentType: string;
    difficulty: string;
    relatedTopics: string;
    searchAction: string;
    returnToTopics: string;
    noTopicsTitle: string;
    noTopicsDescription: string;
    noContentTitle: string;
    noContentDescription: string;
  };
  reference: {
    eyebrow: string;
    availableContent: string;
    contentType: string;
    difficulty: string;
    openContent: string;
    searchAction: string;
    noContentTitle: string;
    noContentDescription: string;
  };
  home: {
    eyebrow: string;
    heroDescription: string;
    primaryAction: string;
    scrollHint: string;
    entriesEyebrow: string;
    entriesTitle: string;
    entriesDescription: string;
    learnEntryTitle: string;
    learnTrackCount: string;
    learnStepCount: string;
    topicsEntryTitle: string;
    topicCount: string;
    referenceEntryTitle: string;
    referenceCount: string;
    chaptersEyebrow: string;
    chaptersTitle: string;
    chaptersDescription: string;
    chapterAction: string;
    communityEyebrow: string;
    communityTitle: string;
    communityDescription: string;
    communityPrimaryAction: string;
    communitySecondaryAction: string;
  };
  // Homepage footer labels / 首页 footer 标签
  homeFooterLabel: string;
  homeFooterCode: string;
  homeFooterOpenSource: string;
  homeFooterCommit: string;
  homeFooterLastCommit: string;
  homeFooterAuthor: string;
  homeFooterUnavailable: string;
  // Homepage footer license labels / 首页 footer 协议标签
  homeFooterCodeLicenseLabel: string;
  homeFooterDocsLicenseLabel: string;
  // Interactive Markdown task-list labels / 可交互 Markdown 任务清单标签
  taskListComplete: string;
  taskListReopen: string;
  taskListItem: string;
  taskListProgressTitle: string;
  taskListProgressLabel: string;
  learningProgressTitle: string;
  learningProgressLabel: string;
  taskListCompletedCount: string;
  taskListTotalCount: string;
  taskListJumpToList: string;
  // Mermaid toolbar a11y labels / Mermaid 工具栏无障碍标签
  mermaidZoomOut: string;
  mermaidZoomIn: string;
  mermaidReset: string;
  mermaidMaximize: string;
  mermaidRestore: string;
  mermaidToolbar: string;
  // Mermaid view mode toggle labels / Mermaid 视图模式切换标签
  mermaidViewMode: string;
  mermaidViewRender: string;
  mermaidViewCode: string;
  mermaidSourceCode: string;
}

const dictionaries: Record<Locale, Dictionary> = { zh, en };

export function getPageDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[i18n.defaultLanguage];
}
