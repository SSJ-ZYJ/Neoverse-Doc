// Status code display separates glyph layers only for balanced outline, focus,
// and sheen effects; the digits still read as one unified typographic mark.
// 状态码展示仅为平衡描边、焦点与扫光效果拆分字形层，数字仍作为统一文字标识呈现。

interface StatusCodeDisplayProps {
  code: string;
}

export function StatusCodeDisplay({ code }: StatusCodeDisplayProps) {
  const occurrences = new Map<string, number>();
  const digits = Array.from(code, (digit) => {
    const occurrence = occurrences.get(digit) ?? 0;
    occurrences.set(digit, occurrence + 1);
    return { digit, key: `${digit}-${occurrence}` };
  });

  return (
    <div aria-label={code} className="status-code-display" role="img">
      <span aria-hidden="true" className="status-code-display__value">
        {digits.map(({ digit, key }) => (
          <span className="status-code-display__digit" data-digit={digit} key={key}>
            {digit}
          </span>
        ))}
      </span>
    </div>
  );
}
