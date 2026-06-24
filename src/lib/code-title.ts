/**
 * Code title helpers: detect file-path comments at the first line of a code block
 * and share the same recognition rules between remark and the runtime code block.
 *
 * 代码标题工具：识别代码块首行的文件路径注释，
 * 让 remark 阶段与运行时代码块共用同一套判断规则。
 */

const FILE_PATH_LINE_PATTERNS = [
  /^[^\S\n]*\/\/[^\S\n]*(.+?)\s*$/,
  /^[^\S\n]*\/\*[^\S\n]*(.+?)\s*\*\/[^\S\n]*$/,
  /^[^\S\n]*#[^\S\n]*(.+?)\s*$/,
  /^[^\S\n]*<!--[^\S\n]*(.+?)\s*-->[^\S\n]*$/,
];

const FILE_EXTENSION_RE = /\.[\w-]{1,10}$/;
const PATH_HINT_RE = /[/\\]/;
const URI_RE = /^[a-z][a-z\d+.-]*:\/\//i;
const SHEBANG_RE = /^[^\S\n]*#!/;
const WHITESPACE_RE = /\s/;

export interface CodeTitleExtraction {
  body: string;
  title: string;
}

export function getFilePathFromCodeTitleLine(line: string) {
  if (SHEBANG_RE.test(line)) return null;

  for (const pattern of FILE_PATH_LINE_PATTERNS) {
    const match = line.match(pattern);
    if (!match?.[1]) continue;

    const candidate = match[1].trim();
    if (isFilePath(candidate)) return candidate;
  }

  return null;
}

export function extractLeadingCodeTitle(value: string): CodeTitleExtraction | null {
  const firstLineMatch = value.match(/^[^\r\n]*(?:\r?\n|$)/);
  const firstLine = firstLineMatch?.[0].replace(/\r?\n$/, '') ?? '';
  const title = getFilePathFromCodeTitleLine(firstLine);
  if (!title) return null;

  return {
    title,
    body: value.slice(firstLineMatch?.[0].length ?? 0).trimStart(),
  };
}

function isFilePath(text: string) {
  if (URI_RE.test(text) || WHITESPACE_RE.test(text)) return false;

  return PATH_HINT_RE.test(text) || FILE_EXTENSION_RE.test(text);
}
