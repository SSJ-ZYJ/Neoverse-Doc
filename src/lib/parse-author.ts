const AUTHOR_REGEX = /^(.+?)\((https?:\/\/[^)]+)\)$/;

export interface AuthorInfo {
  name: string;
  url: string | null;
}

function parseSingleAuthor(raw: string): AuthorInfo {
  const trimmed = raw.trim();
  const match = AUTHOR_REGEX.exec(trimmed);

  if (match) {
    return {
      name: match[1].trim(),
      url: match[2],
    };
  }

  return { name: trimmed, url: null };
}

export function parseAuthor(raw: string | string[]): AuthorInfo[] {
  const items = Array.isArray(raw) ? raw : [raw];
  return items.map((item) => parseSingleAuthor(item)).filter((author) => author.name.length > 0);
}
