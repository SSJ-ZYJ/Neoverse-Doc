import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/content/seo';
import { i18n } from '@/lib/i18n';
import { SITE_ORIGIN } from '@/lib/site-config';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', ...i18n.languages.map((locale) => `/${locale}/docs-source/`)],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_ORIGIN,
  };
}
