/**
 * Language display name mapping configuration.
 * 编程语言显示名称映射配置。
 *
 * Maps short language identifiers (e.g. `js`, `ts`, `py`) to their
 * human-readable display names used in code block headers.
 */

/**
 * Mapping from language identifiers to display names.
 * Keys are stored in lowercase; lookups must normalize input first.
 */
export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  assembly: 'Assembly',
  asm: 'Assembly',
  bash: 'Bash',
  bat: 'Batch',
  c: 'C',
  'c++': 'C++',
  cfg: 'Config',
  cmd: 'CMD',
  clj: 'Clojure',
  clojure: 'Clojure',
  cpp: 'C++',
  cs: 'C#',
  css: 'CSS',
  csharp: 'C#',
  cxx: 'C++',
  dart: 'Dart',
  diff: 'Diff',
  docker: 'Dockerfile',
  dockerfile: 'Dockerfile',
  elixir: 'Elixir',
  env: 'Env',
  erl: 'Erlang',
  erlang: 'Erlang',
  ex: 'Elixir',
  fs: 'F#',
  fsharp: 'F#',
  go: 'Go',
  golang: 'Go',
  gitattributes: 'Git Attributes',
  graphql: 'GraphQL',
  groovy: 'Groovy',
  haskell: 'Haskell',
  hs: 'Haskell',
  html: 'HTML',
  http: 'HTTP',
  ini: 'INI',
  java: 'Java',
  javascript: 'JavaScript',
  jl: 'Julia',
  json: 'JSON',
  jsonc: 'JSONC',
  js: 'JavaScript',
  jsx: 'JSX',
  julia: 'Julia',
  kt: 'Kotlin',
  kotlin: 'Kotlin',
  latex: 'LaTeX',
  less: 'Less',
  lua: 'Lua',
  markdown: 'Markdown',
  matlab: 'MATLAB',
  md: 'Markdown',
  mdx: 'MDX',
  math: 'Math',
  nginx: 'Nginx',
  objc: 'Objective-C',
  objectivec: 'Objective-C',
  octave: 'Octave',
  patch: 'Patch',
  perl: 'Perl',
  php: 'PHP',
  pl: 'Perl',
  powershell: 'PowerShell',
  ps1: 'PowerShell',
  py: 'Python',
  python: 'Python',
  r: 'R',
  rb: 'Ruby',
  regex: 'Regex',
  rest: 'REST',
  ruby: 'Ruby',
  rs: 'Rust',
  rust: 'Rust',
  scala: 'Scala',
  sass: 'Sass',
  shell: 'Shell',
  sh: 'Shell',
  sql: 'SQL',
  svg: 'SVG',
  swift: 'Swift',
  tex: 'LaTeX',
  toml: 'TOML',
  ts: 'TypeScript',
  tsx: 'TSX',
  typescript: 'TypeScript',
  vb: 'VB.NET',
  'vb.net': 'VB.NET',
  vim: 'Vim',
  yml: 'YAML',
  yaml: 'YAML',
  xml: 'XML',
  zsh: 'Zsh',
};

/**
 * Get the human-readable display name for a programming language.
 * Falls back to capitalizing the first letter for unknown identifiers.
 */
export function getLanguageDisplayName(lang: string): string {
  const normalized = lang.toLowerCase();
  return (
    LANGUAGE_DISPLAY_NAMES[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1)
  );
}
