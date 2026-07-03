// Home route group layout: wraps homepage and guestbook with HomeLayout
// which provides the top navbar with language switcher on the right.
// GitHub icon is dropped here (via githubUrl={undefined}) to keep the home
// floating glass navbar clean; docs pages keep it through their own layout.
// 首页路由组布局：使用 HomeLayout 包裹首页和留言墙，提供顶部导航栏和右侧语言切换器。
// 此处通过 githubUrl={undefined} 移除 GitHub 图标，保持首页悬浮玻璃导航栏简洁；
// 文档页通过自己的 layout 保留 GitHub 链接。

import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { generateLocaleStaticParams, resolveLocale } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';

export const generateStaticParams = generateLocaleStaticParams;

export default async function HomeGroupLayout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);

  return (
    <HomeLayout {...baseOptions(locale)} githubUrl={undefined}>
      {children}
    </HomeLayout>
  );
}
