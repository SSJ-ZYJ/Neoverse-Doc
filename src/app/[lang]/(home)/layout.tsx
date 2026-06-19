// Home route group layout: wraps homepage and guestbook with HomeLayout
// which provides the top navbar with language switcher on the right.
// 首页路由组布局：使用 HomeLayout 包裹首页和留言墙，提供顶部导航栏和右侧语言切换器。

import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { generateLocaleStaticParams, resolveLocale } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';

export const generateStaticParams = generateLocaleStaticParams;

export default async function HomeGroupLayout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);

  return <HomeLayout {...baseOptions(locale)}>{children}</HomeLayout>;
}
