// Shared refresh-restore constants and the pre-hydration bootstrap. The inline
// script runs only for document reloads with a valid saved docs anchor.
// 刷新恢复共享常量与水合前引导脚本。仅在文档刷新且存在有效正文锚点时运行。

export const DOCS_REFRESH_POINT_STORAGE_KEY = 'neoverse-docs:refresh-restore';

export const DOCS_REFRESH_RESTORE_BOOTSTRAP = `(() => {
  try {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (!navigation || navigation.type !== 'reload') return;

    const serialized = sessionStorage.getItem('${DOCS_REFRESH_POINT_STORAGE_KEY}');
    if (!serialized) return;

    const point = JSON.parse(serialized);
    let pathname = location.pathname;
    while (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    if (!point || point.sourcePath !== pathname) return;

    document.documentElement.dataset.ndReadingRestore = '';
  } catch {
    // Storage and navigation timing are optional browser capabilities.
    // 存储与导航计时在受限浏览环境中可能不可用。
  }
})();`;
