// Home route group layout: wraps homepage and guestbook with HomeLayout
// which provides the top navbar with language switcher on the right.
// 首页路由组布局：使用 HomeLayout 包裹首页和留言墙，提供顶部导航栏和右侧语言切换器。

import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { i18n, type Locale } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export default async function HomeGroupLayout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = (lang as Locale) ?? i18n.defaultLanguage;

  return <HomeLayout {...baseOptions(locale)}>{children}</HomeLayout>;
}
