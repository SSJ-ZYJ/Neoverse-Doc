// Home route group layout: wraps homepage and guestbook with HomeLayout
// which provides the top navbar with language switcher on the right.
// The same functional actions stay available on home and docs routes.
// 首页路由组布局：使用 HomeLayout 包裹首页和留言墙，提供顶部导航栏和右侧语言切换器。
// 首页与文档路由保留同一组功能入口。

import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/adapters/fumadocs/layout';
import { generateLocaleStaticParams, resolveLocale } from '@/lib/i18n';

export const generateStaticParams = generateLocaleStaticParams;

export default async function HomeGroupLayout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);

  return <HomeLayout {...baseOptions(locale)}>{children}</HomeLayout>;
}
