// Homepage-only configuration for the official HTML-in-Canvas particle scroll.
// 仅主页使用的官方 HTML-in-Canvas 粒子滚动配置。

import { ParticleScroll } from '@/components/canvasui/particle-scroll';

interface HomeParticleScrollProps {
  children: React.ReactNode;
}

export function HomeParticleScroll({ children }: HomeParticleScrollProps) {
  return (
    <ParticleScroll
      className="home-particle-scroll"
      band={420}
      density={2}
      drift={0.7}
      fade={0.85}
      gravity={0.35}
      point={0.7}
      settle={1}
      size={1.25}
      smoothing={0.6}
      spread={220}
      stagger={0.7}
      swirl={60}
    >
      {children}
    </ParticleScroll>
  );
}
