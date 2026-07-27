// Business-facing hero title backed by the localized Split Text effect.
// 由本地化 Split Text 效果驱动的业务 Hero 标题。

import { SplitText } from '@/components/react-bits/split-text';

export function HeroTitle({ id }: { id: string }) {
  return (
    <h1 className="home-hero__title font-orbitron" id={id}>
      <SplitText text="Neoverse-Docs" />
    </h1>
  );
}
