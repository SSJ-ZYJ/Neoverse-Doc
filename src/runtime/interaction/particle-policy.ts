// Single particle budget table: maps interaction kind × pointer type ×
// motion level to emission counts, sampling distance, caps, and birth-ring
// spread. Pure data resolution — no DOM access beyond motion preferences.
// 统一粒子预算表：将交互类别 × 指针类型 × 动效等级映射为发射数量、
// 采样距离、上限与出生环散布。纯数据决策，除动效偏好外不访问 DOM。

import { getEffectiveMotionLevel } from '@/runtime/motion/preferences';
import type { InteractionKind, ParticlePolicy } from './types';

const INITIAL_PARTICLE_COUNT = 28;
const TOUCH_INITIAL_PARTICLE_COUNT = 24;
const SURFACE_INITIAL_PARTICLE_COUNT = 20;
const TOUCH_SURFACE_INITIAL_PARTICLE_COUNT = 18;
const DRAG_PARTICLE_COUNT = 2;
const TOUCH_DRAG_PARTICLE_COUNT = 2;
const SURFACE_DRAG_PARTICLE_COUNT = 1;
const TOUCH_SURFACE_DRAG_PARTICLE_COUNT = 1;
const DRAG_EMIT_DISTANCE_PX = 5;
const TOUCH_DRAG_EMIT_DISTANCE_PX = 6;
const SURFACE_DRAG_EMIT_DISTANCE_PX = 7;
const TOUCH_SURFACE_DRAG_EMIT_DISTANCE_PX = 8;
const MAX_PARTICLES_PER_TARGET = 96;
const INITIAL_BURST_SPREAD_RATIO = 0.12;
const CTA_INITIAL_BURST_SPREAD_RATIO = 0.055;

// CTAs start from a tighter ring so compact buttons do not look fully
// expanded on the first frame; other kinds keep the wider ring.
// CTA 使用更紧凑的出生圆环，避免小按钮首帧看起来已经完全拓开；其他类别保持原比例。
const INITIAL_SPREAD_BOUNDS: Record<
  InteractionKind,
  { initialSpreadMax: number; initialSpreadMin: number }
> = {
  control: { initialSpreadMax: 14, initialSpreadMin: 5 },
  surface: { initialSpreadMax: 14, initialSpreadMin: 5 },
  cta: { initialSpreadMax: 6, initialSpreadMin: 2.5 },
};

export function resolveParticlePolicy(kind: InteractionKind, pointerType: string): ParticlePolicy {
  const touchLike = pointerType === 'touch' || pointerType === 'pen';
  const medium = getEffectiveMotionLevel() === 'medium';
  const scaleCount = (count: number) => (medium ? Math.max(1, Math.round(count * 0.5)) : count);
  const scaleDistance = (distance: number) => (medium ? distance * 1.5 : distance);
  const shared = {
    maxParticles: medium ? Math.round(MAX_PARTICLES_PER_TARGET * 0.5) : MAX_PARTICLES_PER_TARGET,
    travelScale: medium ? 0.65 : 1,
  };

  if (kind === 'surface') {
    return {
      ...shared,
      dragCount: scaleCount(
        touchLike ? TOUCH_SURFACE_DRAG_PARTICLE_COUNT : SURFACE_DRAG_PARTICLE_COUNT,
      ),
      emitDistance: scaleDistance(
        touchLike ? TOUCH_SURFACE_DRAG_EMIT_DISTANCE_PX : SURFACE_DRAG_EMIT_DISTANCE_PX,
      ),
      initialCount: scaleCount(
        touchLike ? TOUCH_SURFACE_INITIAL_PARTICLE_COUNT : SURFACE_INITIAL_PARTICLE_COUNT,
      ),
      initialSpreadRatio: INITIAL_BURST_SPREAD_RATIO,
      ...INITIAL_SPREAD_BOUNDS.surface,
    };
  }

  return {
    ...shared,
    dragCount: scaleCount(touchLike ? TOUCH_DRAG_PARTICLE_COUNT : DRAG_PARTICLE_COUNT),
    emitDistance: scaleDistance(touchLike ? TOUCH_DRAG_EMIT_DISTANCE_PX : DRAG_EMIT_DISTANCE_PX),
    initialCount: scaleCount(touchLike ? TOUCH_INITIAL_PARTICLE_COUNT : INITIAL_PARTICLE_COUNT),
    initialSpreadRatio:
      kind === 'cta' ? CTA_INITIAL_BURST_SPREAD_RATIO : INITIAL_BURST_SPREAD_RATIO,
    ...INITIAL_SPREAD_BOUNDS[kind],
  };
}
