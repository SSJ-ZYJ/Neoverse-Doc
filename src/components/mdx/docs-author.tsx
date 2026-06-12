// Document author display component with GitHub avatar support.
// 文档作者展示组件，支持 GitHub 头像。

'use client';

import { User } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { type AuthorInfo, parseAuthor } from '@/lib/parse-author';

type AuthorInput = string | string[];

interface DocsAuthorProps {
  author: AuthorInput;
  label: string;
}

interface DocsContributorsProps {
  contributors: AuthorInput;
  title: string;
}

function getGithubAvatar(url: string): string | null {
  const match = url.match(/github\.com\/([^/]+)/);
  if (match) {
    return `https://github.com/${match[1]}.png?size=32`;
  }
  return null;
}

function AuthorAvatar({ name, src }: { name: string; src: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error) {
    return (
      <div className="size-5 rounded-md bg-fd-muted-foreground/20 flex items-center justify-center">
        <User size={12} className="text-fd-muted-foreground" />
      </div>
    );
  }

  return (
    <span className="relative inline-block size-5">
      {!loaded && (
        <span className="absolute inset-0 rounded-md bg-fd-muted-foreground/20 animate-pulse" />
      )}
      <Image
        src={src}
        alt={name}
        width={20}
        height={20}
        className={`rounded-md transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}

// Shared author list renderer for the page header and contributor footer.
// 页面头部作者与页尾贡献者共用的头像 + 名称列表渲染器。
function AuthorList({ authors }: { authors: AuthorInfo[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {authors.map((item, index) => {
        const avatar = item.url ? getGithubAvatar(item.url) : null;
        const isLink = !!item.url;

        return (
          <span key={item.name} className="inline-flex items-center gap-3">
            {index > 0 && <span className="text-fd-muted-foreground/50">|</span>}
            <span className="inline-flex items-center gap-1.5">
              {avatar && <AuthorAvatar name={item.name} src={avatar} />}
              {isLink ? (
                <a
                  href={item.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fd-muted-foreground underline underline-offset-2 transition-colors hover:text-fd-foreground"
                >
                  {item.name}
                </a>
              ) : (
                <span>{item.name}</span>
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function DocsAuthor({ author, label }: DocsAuthorProps) {
  const authors = parseAuthor(author);

  if (authors.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 flex items-center gap-3 text-sm text-fd-muted-foreground">
      <User size={14} className="shrink-0" />
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        <span className="font-medium text-fd-foreground">{label}</span>
        <AuthorList authors={authors} />
      </div>
    </div>
  );
}

// Contributor footer section shown after MDX content when contributors are defined.
// 当文档定义 contributors 时，在正文末尾展示贡献者区域。
export function DocsContributors({ contributors, title }: DocsContributorsProps) {
  const authors = parseAuthor(contributors);

  if (authors.length === 0) {
    return null;
  }

  return (
    <section className="order-last mt-12 border-t border-fd-border pt-8">
      <h2 className="mb-4 text-base font-semibold text-fd-foreground">{title}</h2>
      <div className="flex items-center gap-3 text-sm text-fd-muted-foreground">
        <User size={14} className="shrink-0" />
        <AuthorList authors={authors} />
      </div>
    </section>
  );
}
