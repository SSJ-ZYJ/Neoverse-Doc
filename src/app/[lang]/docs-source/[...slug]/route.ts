// Static Markdown source endpoint for Fumadocs page actions.
// 为 Fumadocs 页面操作提供静态 Markdown 源码端点。

import { notFound } from 'next/navigation';
import { source } from '@/adapters/fumadocs/source';
import { resolveLocale } from '@/lib/i18n';

export const revalidate = false;

export async function GET(
  _request: Request,
  { params }: RouteContext<'/[lang]/docs-source/[...slug]'>,
) {
  const { lang, slug } = await params;
  // Strip the `.md` suffix appended in generateStaticParams to recover the
  // real page slug before looking up the source.
  // 去掉 generateStaticParams 追加的 `.md` 后缀，恢复真实页面 slug 后查源。
  const realSlug = slug.map((segment, i) =>
    i === slug.length - 1 ? segment.replace(/\.md$/, '') : segment,
  );
  const locale = resolveLocale(lang);
  const page = source.getPage(realSlug, locale);
  if (!page) notFound();

  return new Response(await page.data.getText('raw'), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}

export function generateStaticParams() {
  // Append `.md` to the last slug segment so static export emits files like
  // `out/.../about.md` instead of `out/.../about`. Without the extension,
  // `about` (index page body) collides with `about/` (directory holding
  // `about/guide.md`, `about/about.md`, …) on the filesystem and Next.js
  // aborts the copy with EPERM on Windows (and similarly on POSIX).
  // 在最后一段 slug 末尾追加 `.md`，使静态导出产物为 `out/.../about.md`
  // 而非 `out/.../about`。否则 `about`（index 页面 body）与 `about/`
  //（存放 about/guide.md、about/about.md 等子页面的目录）在文件系统上
  // 冲突，Next.js 复制时报 EPERM。
  return source.generateParams().map((p) => ({
    ...p,
    slug: p.slug.map((segment, i) => (i === p.slug.length - 1 ? `${segment}.md` : segment)),
  }));
}
