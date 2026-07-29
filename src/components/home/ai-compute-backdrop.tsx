// Structured AI accelerator backdrop uses a central processor, memory banks,
// orthogonal buses, and compute cores instead of an abstract line network.
// 结构化 AI 加速器背景由中央处理器、存储单元、正交总线与计算核心组成。

interface AiComputeBackdropProps {
  variant: 'knowledge' | 'community';
}

export function AiComputeBackdrop({ variant }: AiComputeBackdropProps) {
  return (
    <div aria-hidden="true" className={`ai-compute ai-compute--${variant}`}>
      <svg
        aria-hidden="true"
        className="ai-compute__board"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 1200 520"
      >
        <g className="ai-compute__buses">
          <path d="M0 104 H250 V180 H466" pathLength={1} />
          <path d="M0 416 H250 V340 H466" pathLength={1} />
          <path d="M734 180 H950 V104 H1200" pathLength={1} />
          <path d="M734 340 H950 V416 H1200" pathLength={1} />
          <path d="M180 260 H466" pathLength={1} />
          <path d="M734 260 H1020" pathLength={1} />
          <path d="M600 0 V126" pathLength={1} />
          <path d="M600 394 V520" pathLength={1} />
        </g>
        <g className="ai-compute__memory">
          <rect height="58" rx="12" width="150" x="56" y="75" />
          <rect height="58" rx="12" width="150" x="56" y="387" />
          <rect height="58" rx="12" width="150" x="994" y="75" />
          <rect height="58" rx="12" width="150" x="994" y="387" />
        </g>
        <g className="ai-compute__nodes">
          <circle cx="250" cy="104" r="7" />
          <circle cx="250" cy="416" r="7" />
          <circle cx="950" cy="104" r="7" />
          <circle cx="950" cy="416" r="7" />
          <circle cx="180" cy="260" r="9" />
          <circle cx="1020" cy="260" r="9" />
        </g>
        <g className="ai-compute__chip">
          <rect height="268" rx="30" width="268" x="466" y="126" />
          <rect height="216" rx="22" width="216" x="492" y="152" />
          <g className="ai-compute__cores">
            <rect height="52" rx="10" width="52" x="514" y="174" />
            <rect height="52" rx="10" width="52" x="574" y="174" />
            <rect height="52" rx="10" width="52" x="634" y="174" />
            <rect height="52" rx="10" width="52" x="514" y="234" />
            <rect height="52" rx="10" width="52" x="574" y="234" />
            <rect height="52" rx="10" width="52" x="634" y="234" />
            <rect height="52" rx="10" width="52" x="514" y="294" />
            <rect height="52" rx="10" width="52" x="574" y="294" />
            <rect height="52" rx="10" width="52" x="634" y="294" />
          </g>
        </g>
      </svg>
      <span className="ai-compute__pulse" />
    </div>
  );
}
