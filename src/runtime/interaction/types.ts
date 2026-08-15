// Shared interaction runtime types: contract kinds plus the geometry,
// session, emission, and policy shapes exchanged between modules.
// 交互运行时共享类型：契约类别，以及各模块间传递的几何、会话、发射与策略结构。

export type InteractionKind = 'control' | 'surface' | 'cta';

// 'inset-before' reads the visible ::before pseudo surface instead of the
// padded host box; 'box' reads the element's own border box.
// 'inset-before' 读取可见的 ::before 伪表面而非带留白的宿主盒；'box' 读取元素自身边界盒。
export type GeometryMode = 'box' | 'inset-before';

export interface ResolvedInteractionTarget {
  geometryMode: GeometryMode;
  kind: InteractionKind;
  target: HTMLElement;
}

export interface InteractionRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

export interface InteractionGeometry {
  radius: string;
  rect: InteractionRect;
}

export interface ParticleEmission {
  count: number;
  direction?: number;
  originX: number;
  originY: number;
}

// Budget resolved by the particle policy; consumed by the session loop and emitter.
// 由粒子策略解析出的预算；供会话循环与发射器消费。
export interface ParticlePolicy {
  dragCount: number;
  emitDistance: number;
  initialCount: number;
  initialSpreadMax: number;
  initialSpreadMin: number;
  initialSpreadRatio: number;
  maxParticles: number;
  travelScale: number;
}

export interface ParticleSession {
  lastX: number;
  lastY: number;
  policy: ParticlePolicy;
  rect: InteractionRect;
  target: HTMLElement;
  token: string;
}
