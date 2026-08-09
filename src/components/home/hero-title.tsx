// Business-facing hero title backed by the theme-aware Particle Text effect.
// 由主题自适应 Particle Text 效果驱动的业务 Hero 标题。

import { ParticleText } from '@/components/react-bits/particle-text';
import { MOTION_DURATION_MS } from '@/lib/motion-config';

const HOME_TITLE = 'NEOVERSE-DOCS';

export function HeroTitle({ id }: { id: string }) {
  return (
    <h1 aria-label={HOME_TITLE} className="home-hero__title font-orbitron" id={id}>
      <ParticleText
        color="var(--color-brand-start)"
        density={4}
        fontFamily="inherit"
        fontSize="inherit"
        fontWeight="inherit"
        gatherDuration={MOTION_DURATION_MS.expressive}
        glow
        highlightColor="var(--color-brand-end)"
        idleDrift={0}
        particleSize={1.8}
        pointerRepel={18}
        repelRadius={96}
        scatter={108}
        stagger={MOTION_DURATION_MS.fast}
        text={HOME_TITLE}
        trigger="mount"
      />
    </h1>
  );
}
