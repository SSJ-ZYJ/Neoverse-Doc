const FNV_OFFSET_BASIS_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;

export function normalizeMermaidSource(source: string): string {
  return source.replace(/\r\n?/g, '\n').trim();
}

// A compact source identifier keeps complete chart definitions out of the
// client manifest. The Content IR extractor, the build pipeline and the
// browser runtime all call this exact shared function, so a diagram keeps one
// identity from MDX extraction to client asset lookup.
// 紧凑源码标识可避免把完整图表定义重复写入客户端清单。Content IR 提取器、
// 构建管线与浏览器运行时调用同一个函数，使一张图从 MDX 提取到客户端资产
// 查找始终保持同一身份。
export function getMermaidSourceId(source: string): string {
  const normalized = normalizeMermaidSource(source);
  let hash = FNV_OFFSET_BASIS_64;

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= BigInt(normalized.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * FNV_PRIME_64);
  }

  return hash.toString(16).padStart(16, '0');
}
