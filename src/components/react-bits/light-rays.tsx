// Lightweight local adaptation of React Bits Light Rays. It uses CSS layers
// instead of WebGL so the hero keeps its atmosphere without adding `ogl`.
// React Bits Light Rays 的轻量本地化改造：使用 CSS 图层替代 WebGL，避免新增 `ogl`。

interface LightRaysProps {
  className?: string;
}

export function LightRays({ className = '' }: LightRaysProps) {
  return (
    <div aria-hidden="true" className={`rb-light-rays ${className}`}>
      <span className="rb-light-rays__beam rb-light-rays__beam--wide" />
      <span className="rb-light-rays__beam rb-light-rays__beam--narrow" />
      <span className="rb-light-rays__network" />
    </div>
  );
}
