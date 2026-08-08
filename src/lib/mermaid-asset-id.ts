const FNV_OFFSET_BASIS_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;

export function normalizeMermaidSource(source: string): string {
  return source.replace(/\r\n?/g, '\n').trim();
}

// A compact source identifier keeps complete chart definitions out of the
// client manifest. Build and browser paths call this exact shared function.
// 紧凑源码标识可避免把完整图表定义重复写入客户端清单；构建端与浏览器端
// 调用同一个函数，避免两份哈希实现发生偏差。
export function getMermaidSourceId(source: string): string {
  const normalized = normalizeMermaidSource(source);
  let hash = FNV_OFFSET_BASIS_64;

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= BigInt(normalized.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * FNV_PRIME_64);
  }

  return hash.toString(16).padStart(16, '0');
}
