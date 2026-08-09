// Project-adapted React Bits GradualBlur. This keeps only the static bottom-edge
// blur used by document pages, avoiding resize, hover, and scroll listeners in
// the visual component itself.
// 项目适配版 React Bits GradualBlur：仅保留文档页使用的静态底部渐进模糊，
// 避免在视觉组件内部增加 resize、hover 与 scroll 监听。

import type { ComponentProps, CSSProperties } from 'react';

type BlurCurve = 'bezier' | 'ease-in' | 'ease-out' | 'linear';

interface GradualBlurProps extends Omit<ComponentProps<'div'>, 'children'> {
  curve?: BlurCurve;
  divCount?: number;
  exponential?: boolean;
  height?: CSSProperties['height'];
  opacity?: number;
  strength?: number;
}

const CURVE_FUNCTIONS: Record<BlurCurve, (progress: number) => number> = {
  linear: (progress) => progress,
  bezier: (progress) => progress * progress * (3 - 2 * progress),
  'ease-in': (progress) => progress * progress,
  'ease-out': (progress) => 1 - (1 - progress) ** 2,
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export function GradualBlur({
  className,
  curve = 'linear',
  divCount = 3,
  exponential = false,
  height = '4rem',
  opacity = 1,
  strength = 1,
  style,
  ...props
}: GradualBlurProps) {
  const layerCount = Math.max(1, Math.floor(divCount));
  const increment = 100 / layerCount;
  const curveFunction = CURVE_FUNCTIONS[curve];

  const layers = Array.from({ length: layerCount }, (_, index) => {
    const layer = index + 1;
    const progress = curveFunction(layer / layerCount);
    const blur = exponential
      ? 2 ** (progress * 4) * 0.0625 * strength
      : 0.0625 * (progress * layerCount + 1) * strength;
    const start = Math.round((increment * layer - increment) * 10) / 10;
    const solidStart = Math.round(increment * layer * 10) / 10;
    const solidEnd = Math.round((increment * layer + increment) * 10) / 10;
    const end = Math.round((increment * layer + increment * 2) * 10) / 10;
    const stops = [`transparent ${start}%`, `black ${solidStart}%`];

    if (solidEnd <= 100) stops.push(`black ${solidEnd}%`);
    if (end <= 100) stops.push(`transparent ${end}%`);

    const maskImage = `linear-gradient(to bottom, ${stops.join(', ')})`;
    const layerStyle: CSSProperties = {
      WebkitBackdropFilter: `blur(${blur.toFixed(3)}rem)`,
      WebkitMaskImage: maskImage,
      backdropFilter: `blur(${blur.toFixed(3)}rem)`,
      maskImage,
      opacity,
    };

    return <span className="gradual-blur__layer" key={layer} style={layerStyle} />;
  });

  return (
    <div
      {...props}
      aria-hidden="true"
      className={joinClassNames('gradual-blur', className)}
      style={{ height, ...style }}
    >
      <span className="gradual-blur__inner">{layers}</span>
    </div>
  );
}
