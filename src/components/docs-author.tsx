'use client';

import { User } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { parseAuthor } from '@/lib/parse-author';

interface DocsAuthorProps {
  author: string | string[];
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

  if (error) {
    return (
      <div className="size-5 rounded-md bg-fd-muted-foreground/20 flex items-center justify-center">
        <User size={12} className="text-fd-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={20}
      height={20}
      className="rounded-md"
      onError={() => setError(true)}
    />
  );
}

export function DocsAuthor({ author }: DocsAuthorProps) {
  const authors = parseAuthor(author);

  return (
    <div className="mb-6 flex items-center gap-3 text-sm text-fd-muted-foreground">
      <User size={14} className="shrink-0" />
      <div className="flex items-center gap-3">
        {authors.map((item, index) => {
          const avatar = item.url ? getGithubAvatar(item.url) : null;
          const isLink = !!item.url;

          return (
            <span key={item.name} className="inline-flex items-center gap-3">
              {index > 0 && (
                <span className="text-fd-muted-foreground/50">|</span>
              )}
              <span className="inline-flex items-center gap-1.5">
                {avatar && <AuthorAvatar name={item.name} src={avatar} />}
                {isLink ? (
                  <a
                    href={item.url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fd-muted-foreground hover:text-fd-foreground underline underline-offset-2 transition-colors"
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
    </div>
  );
}
