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
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  tsx: 'TSX',
  jsx: 'JSX',
  python: 'Python',
  py: 'Python',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  less: 'Less',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  markdown: 'Markdown',
  md: 'Markdown',
  mdx: 'MDX',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  zsh: 'Zsh',
  powershell: 'PowerShell',
  ps1: 'PowerShell',
  rust: 'Rust',
  rs: 'Rust',
  go: 'Go',
  golang: 'Go',
  c: 'C',
  cpp: 'C++',
  'c++': 'C++',
  cxx: 'C++',
  java: 'Java',
  kotlin: 'Kotlin',
  kt: 'Kotlin',
  swift: 'Swift',
  php: 'PHP',
  ruby: 'Ruby',
  rb: 'Ruby',
  sql: 'SQL',
  graphql: 'GraphQL',
  dockerfile: 'Dockerfile',
  docker: 'Dockerfile',
  nginx: 'Nginx',
  vim: 'Vim',
  lua: 'Lua',
  perl: 'Perl',
  pl: 'Perl',
  r: 'R',
  scala: 'Scala',
  dart: 'Dart',
  elixir: 'Elixir',
  ex: 'Elixir',
  erlang: 'Erlang',
  erl: 'Erlang',
  haskell: 'Haskell',
  hs: 'Haskell',
  clojure: 'Clojure',
  clj: 'Clojure',
  groovy: 'Groovy',
  matlab: 'MATLAB',
  octave: 'Octave',
  julia: 'Julia',
  jl: 'Julia',
  fsharp: 'F#',
  fs: 'F#',
  csharp: 'C#',
  cs: 'C#',
  vb: 'VB.NET',
  'vb.net': 'VB.NET',
  objectivec: 'Objective-C',
  objc: 'Objective-C',
  assembly: 'Assembly',
  asm: 'Assembly',
  toml: 'TOML',
  ini: 'INI',
  cfg: 'Config',
  env: 'Env',
  diff: 'Diff',
  patch: 'Patch',
  regex: 'Regex',
  http: 'HTTP',
  rest: 'REST',
  svg: 'SVG',
  math: 'Math',
  latex: 'LaTeX',
  tex: 'LaTeX',
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
