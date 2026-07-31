// Page-level custom copy (NOT fumadocs UI translations).
// fumadocs-ui internal labels live in src/lib/layout.shared.tsx via defineI18nUI.
// This dictionary only holds tagline / nav text / etc. consumed by app pages.
// 页面自定义文案（非 fumadocs UI 翻译）。
// fumadocs-ui 内部 UI 文案由 src/lib/layout.shared.tsx 的 defineI18nUI 管理。
// 本字典只承载页面用到的 副标题 / 导航栏名 / 卡片标题等业务文案。

import type { Dictionary } from './index';

export const zh = {
  siteTitle: 'Neoverse-Docs',
  tagline: '面向计算机学习者的开放知识网络',
  loading: '加载中…',
  // Visual loading marquee label.
  // 可视化加载跑马灯标签。
  loadingMarquee: 'LOADING...',
  enterDocs: '进入文档',
  guestbookTitle: '留言板',
  guestbookDesc: '在这里留下你对 Neoverse-Docs 的建议与反馈',
  communityTitle: '讨论区',
  communityDesc: '欢迎分享你的想法与建议',
  primaryAuthorLabel: '主要编写者：',
  documentContributorsTitle: '本文档贡献者',
  backToDocs: '返回文档',
  backToHome: '返回首页',
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
  // Homepage portal copy / 首页内容门户文案
  home: {
    eyebrow: '开放知识网络 · 持续生长',
    heroDescription: '从计算机基础到算法实践，把零散经验连接成清晰、可检索、可共同维护的学习路径。',
    scrollHint: '探索知识版图',
    chaptersEyebrow: '知识坐标',
    chaptersTitle: '从真实章节开始探索',
    chaptersDescription: '入口直接来自当前文档树；内容更新时，首页会随之保持一致。',
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
  mermaidCodeEditor: 'Mermaid 代码编辑器',
} satisfies Dictionary;
