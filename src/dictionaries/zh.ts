// Page-level custom copy (NOT fumadocs UI translations).
// fumadocs-ui internal labels live in src/adapters/fumadocs/layout.tsx via defineI18nUI.
// This dictionary only holds tagline / nav text / etc. consumed by app pages.
// 页面自定义文案（非 fumadocs UI 翻译）。
// fumadocs-ui 内部 UI 文案由 src/adapters/fumadocs/layout.tsx 的 defineI18nUI 管理。
// 本字典只承载页面用到的 副标题 / 导航栏名 / 卡片标题等业务文案。

import type { Dictionary } from './index';

export const zh = {
  siteTitle: 'Neoverse-Docs',
  tagline: '一份面向 CSer 的技术文档',
  loading: '加载中…',
  // Visual loading marquee label.
  // 可视化加载跑马灯标签。
  loadingMarquee: 'LOADING...',
  enterDocs: '进入文档',
  languageGatewayTitle: '选择阅读语言',
  languageGatewayDescription: '本站会根据浏览器语言自动选择入口，你也可以手动进入中文站点。',
  languageGatewayAction: '进入中文站点',
  guestbookTitle: '留言板',
  guestbookDesc: '在这里留下你对 Neoverse-Docs 的建议与反馈',
  communityTitle: '讨论区',
  communityDesc: '欢迎分享你的想法与建议',
  primaryAuthorLabel: '主要编写者：',
  documentContributorsTitle: '本文档贡献者',
  pageActionsLabel: '更多',
  // Page actions menu item labels / 页面操作菜单项文案
  pageActionsViewSource: '查看源码',
  pageActionsOpenGithub: '在 GitHub 中打开',
  backToDocs: '返回文档',
  backToHome: '返回首页',
  backToTop: '返回文章顶部',
  // Motion settings labels / 动效设置文案
  motionSettingsLabel: '动效设置',
  motionSettingsDescription: '调整本站的视觉反馈与实验性增强效果。',
  motionLevelLabel: '动效强度',
  motionLevelLow: '低',
  motionLevelMedium: '中',
  motionLevelHigh: '高',
  experimentalMotionLabel: '实验性动效',
  experimentalMotionDescription: '使用依赖实验性浏览器图形能力的增强效果。',
  experimentalMotionUnavailableLow: '低动效强度下不可用。',
  experimentalMotionUnavailableUnsupported: '当前浏览器或图形环境不支持所需的实验性能力。',
  systemReducedMotionNotice: '系统当前要求减少动态效果，本站已按低档动效强度运行。',
  // Search scope labels / 搜索范围标签
  searchScopeLabel: '搜索范围',
  searchAllChapters: '全部章节',
  // Cross-document reading return labels / 跨文档阅读返回标签
  readingReturnAction: '返回阅读位置',
  readingReturnAriaLabel: '返回“{title}”的阅读位置',
  readingReturnDismiss: '关闭返回阅读位置按钮',
  // Route error recovery copy / 路由错误恢复文案
  errorTitle: '页面加载失败',
  errorCode: '500',
  errorDesc: '发生了意外错误，请尝试重新加载页面。',
  errorRetry: '重试',
  notFoundTitle: '页面未找到',
  notFoundCode: '404',
  notFoundDesc: '你访问的页面可能已被移除、重命名或暂时不可用。',
  notFoundBack: '返回上一页',
  notFoundHome: '返回首页',
  notFoundDocs: '进入文档',
  // Draft document gate labels / 草稿文档门禁文案
  draftBadge: '前方施工',
  draftTitle: '这篇文档还在撰写中',
  draftDescription:
    '内容正在加紧编写和反复打磨。你可以先去上一篇，也可以悄悄掀开围挡，看看现在写到哪了……草稿状态下的文章内可能含各种各样的错误内容，仅供满足好奇心，勿作为正式参考。',
  draftPrevious: '先看上一篇',
  draftHome: '返回知识地图',
  draftReveal: '我就偷看一眼👀',
  draftUnlocked: '草稿正文已展开。',
  // Homepage portal copy / 首页内容门户文案
  home: {
    eyebrow: 'DO SOMETHING GREAT',
    heroDescription: '一份还在持续建设的“技术”文档',
    scrollHint: '探索与发现',
    chaptersEyebrow: '知识坐标',
    chaptersTitle: '章节版图',
    chaptersDescription: '现阶段包含的内容',
    chapterAction: '打开章节',
    communityEyebrow: '共同维护',
    communityTitle: '让知识网络继续生长',
    communityDescription: '发现错误、缺失的路径或更好的解释？欢迎从讨论开始，也欢迎直接参与共建。',
    communityPrimaryAction: '参与贡献',
    communitySecondaryAction: '前往留言板',
  },
  // Homepage footer labels / 首页 footer 标签
  homeFooterLabel: '项目页脚',
  homeFooterCode: '本项目代码',
  homeFooterOpenSource: '已开源',
  homeFooterCommit: 'Commit',
  homeFooterLastCommit: '最后提交',
  homeFooterAuthor: '作者',
  homeFooterUnavailable: '未知',
  // Homepage footer license labels / 首页 footer 协议标签
  homeFooterCodeLicenseLabel: '项目源码协议',
  homeFooterDocsLicenseLabel: '文档协议',
  // Interactive Markdown task-list labels / 可交互 Markdown 任务清单标签
  taskListComplete: '将“{title}”标记为已完成',
  taskListReopen: '将“{title}”恢复为待完成',
  taskListItem: '任务项',
  taskListProgressTitle: 'TODO 进度',
  taskListProgressLabel: 'TODO 进度：已完成 {completed} 项，共 {total} 项',
  learningProgressTitle: '学习进度',
  learningProgressLabel: '学习进度：已完成 {completed} 项，共 {total} 项',
  taskListCompletedCount: '已完成',
  taskListTotalCount: '总计',
  taskListJumpToList: '查看清单',
  // Mermaid toolbar a11y labels / Mermaid 工具栏无障碍标签
  mermaidZoomOut: '缩小图表',
  mermaidZoomIn: '放大图表',
  mermaidReset: '重置缩放',
  mermaidMaximize: '放大查看',
  mermaidRestore: '还原',
  mermaidToolbar: '图表工具栏',
  // Mermaid view mode toggle labels / Mermaid 视图模式切换标签
  mermaidViewMode: 'Mermaid 视图模式',
  mermaidViewRender: '渲染视图',
  mermaidViewCode: '代码视图',
  mermaidSourceCode: 'Mermaid 源代码',
} satisfies Dictionary;
