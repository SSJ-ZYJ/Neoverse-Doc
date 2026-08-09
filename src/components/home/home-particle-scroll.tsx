// Homepage-only configuration for the official HTML-in-Canvas particle scroll.
// 仅主页使用的官方 HTML-in-Canvas 粒子滚动配置。

import { ParticleScroll } from '@/components/canvasui/particle-scroll';

interface HomeParticleScrollProps {
  children: React.ReactNode;
}

export function HomeParticleScroll({ children }: HomeParticleScrollProps) {
  return (
    <ParticleScroll
      band={260}
      className="home-particle-scroll"
      density={2}
      drift={0.7}
      fade={0.85}
      gravity={0.35}
      point={0.84}
      settle={0.42}
      size={1.25}
      smoothing={0.2}
      spread={180}
      stagger={0.7}
      swirl={54}
    >
      {children}
    </ParticleScroll>
  );
}
