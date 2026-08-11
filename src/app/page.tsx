// Root language gateway: static export keeps a crawlable page while the client
// selects Chinese or English from browser language preferences.
// 根语言分流入口：静态导出保留可抓取页面，客户端再按浏览器语言选择中英文入口。

import type { Metadata } from 'next';
import { LanguageGateway } from '@/components/language-gateway';
import { getPageDictionary } from '@/dictionaries';
import { SOCIAL_IMAGE } from '@/lib/site-config';

const zh = getPageDictionary('zh');
const en = getPageDictionary('en');

export const metadata: Metadata = {
  title: zh.siteTitle,
  description: `${zh.tagline} / ${en.tagline}`,
  openGraph: {
    type: 'website',
    title: zh.siteTitle,
    description: `${zh.tagline} / ${en.tagline}`,
    siteName: zh.siteTitle,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: zh.siteTitle,
    description: `${zh.tagline} / ${en.tagline}`,
    images: [SOCIAL_IMAGE],
  },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function RootLanguageGateway() {
  return <LanguageGateway />;
}
