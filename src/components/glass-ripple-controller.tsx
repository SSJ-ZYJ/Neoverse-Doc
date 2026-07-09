// Glass particle controller: creates Huawei-style lively particles inside controls.
// 玻璃粒子控制器：在控件内部生成华为沉浸光感式灵动粒子。

'use client';

import { useEffect } from 'react';

const RIPPLE_CONTROL_SELECTOR = [
  '.glass-interactive',
  '.glass-interactive--chip',
  '.glass-cta',
  '#nd-nav button',
  '#nd-sidebar button',
  '#nd-sidebar-mobile button',
  '#nd-docs-layout header button',
  '[role="dialog"] button',
  '[data-radix-popper-content-wrapper] button',
  '[data-toc-popover-trigger]',
  '.mermaid-toolbar button',
].join(', ');

// Content glass surfaces also receive particles, but use a smaller budget on touch devices.
// 内容玻璃表面同样接入粒子，但触屏设备使用更轻的粒子预算。
const RIPPLE_SURFACE_SELECTOR = [
  '.glass-codeblock',
  '.mermaid-wrapper',
  '.markdown-alert',
  '.markdown-details',
  '#nd-page div[data-orientation]:has(> [role="tablist"])',
  ':where(#nd-page) :where(.prose-no-margin):has(> table)',
].join(', ');

const RIPPLE_SELECTOR = [RIPPLE_CONTROL_SELECTOR, RIPPLE_SURFACE_SELECTOR].join(', ');

const RIPPLE_DURATION_MS = 1880;
const INITIAL_PARTICLE_COUNT = 44;
const TOUCH_INITIAL_PARTICLE_COUNT = 38;
const SURFACE_INITIAL_PARTICLE_COUNT = 34;
const TOUCH_SURFACE_INITIAL_PARTICLE_COUNT = 28;
const DRAG_PARTICLE_COUNT = 14;
const TOUCH_DRAG_PARTICLE_COUNT = 10;
const SURFACE_DRAG_PARTICLE_COUNT = 8;
const TOUCH_SURFACE_DRAG_PARTICLE_COUNT = 6;
const DRAG_EMIT_INTERVAL_MS = 64;
const TOUCH_DRAG_EMIT_INTERVAL_MS = 76;
const SURFACE_DRAG_EMIT_INTERVAL_MS = 86;
const TOUCH_SURFACE_DRAG_EMIT_INTERVAL_MS = 104;
const DRAG_EMIT_DISTANCE_PX = 4;
const TOUCH_DRAG_EMIT_DISTANCE_PX = 5.5;
const SURFACE_DRAG_EMIT_DISTANCE_PX = 7;
const TOUCH_SURFACE_DRAG_EMIT_DISTANCE_PX = 9;
const MAX_PARTICLES_PER_TARGET = 128;
const PARTICLE_SAFE_INSET_PX = 4;
const PARTICLE_START_JITTER_PX = 5;
const PARTICLE_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const PARTICLE_FULL_TURN = Math.PI * 2;
const PARTICLE_LAYER_SELECTOR = '.glass-ripple-particles';

interface ControlRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface RippleSession {
  dragCount: number;
  emitDistance: number;
  emitInterval: number;
  hasPointerCapture: boolean;
  lastEmitAt: number;
  lastX: number;
  lastY: number;
  rect: ControlRect;
  target: HTMLElement;
  token: string;
}

interface ParticleBurstOptions {
  count: number;
  direction?: number;
  reset?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function ratioBetween(value: number, min: number, max: number) {
  if (max <= min) {
    return 0;
  }

  return clamp((value - min) / (max - min), 0, 1);
}

function readControlRect(target: HTMLElement): ControlRect {
  const rect = target.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
}

function getBurstConfig(pointerType: string, target: HTMLElement) {
  const isTouchLike = pointerType === 'touch' || pointerType === 'pen';
  const isContentSurface = target.matches(RIPPLE_SURFACE_SELECTOR);

  if (isContentSurface) {
    return {
      dragCount: isTouchLike ? TOUCH_SURFACE_DRAG_PARTICLE_COUNT : SURFACE_DRAG_PARTICLE_COUNT,
      emitDistance: isTouchLike
        ? TOUCH_SURFACE_DRAG_EMIT_DISTANCE_PX
        : SURFACE_DRAG_EMIT_DISTANCE_PX,
      emitInterval: isTouchLike
        ? TOUCH_SURFACE_DRAG_EMIT_INTERVAL_MS
        : SURFACE_DRAG_EMIT_INTERVAL_MS,
      hasPointerCapture: false,
      initialCount: isTouchLike
        ? TOUCH_SURFACE_INITIAL_PARTICLE_COUNT
        : SURFACE_INITIAL_PARTICLE_COUNT,
    };
  }

  return {
    dragCount: isTouchLike ? TOUCH_DRAG_PARTICLE_COUNT : DRAG_PARTICLE_COUNT,
    emitDistance: isTouchLike ? TOUCH_DRAG_EMIT_DISTANCE_PX : DRAG_EMIT_DISTANCE_PX,
    emitInterval: isTouchLike ? TOUCH_DRAG_EMIT_INTERVAL_MS : DRAG_EMIT_INTERVAL_MS,
    hasPointerCapture: true,
    initialCount: isTouchLike ? TOUCH_INITIAL_PARTICLE_COUNT : INITIAL_PARTICLE_COUNT,
  };
}

function distanceToControlEdge(x: number, y: number, angle: number, width: number, height: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const maxX =
    Math.abs(cos) < 0.001
      ? Number.POSITIVE_INFINITY
      : cos > 0
        ? (width - PARTICLE_SAFE_INSET_PX - x) / cos
        : (x - PARTICLE_SAFE_INSET_PX) / Math.abs(cos);
  const maxY =
    Math.abs(sin) < 0.001
      ? Number.POSITIVE_INFINITY
      : sin > 0
        ? (height - PARTICLE_SAFE_INSET_PX - y) / sin
        : (y - PARTICLE_SAFE_INSET_PX) / Math.abs(sin);

  return Math.max(0, Math.min(maxX, maxY));
}

function resolveLocalPoint(
  target: HTMLElement,
  rect: ControlRect,
  clientX: number,
  clientY: number,
) {
  const maxX = Math.max(PARTICLE_SAFE_INSET_PX, rect.width - PARTICLE_SAFE_INSET_PX);
  const maxY = Math.max(PARTICLE_SAFE_INSET_PX, rect.height - PARTICLE_SAFE_INSET_PX);
  const x = clamp(clientX - rect.left, PARTICLE_SAFE_INSET_PX, maxX);
  const y = clamp(clientY - rect.top, PARTICLE_SAFE_INSET_PX, maxY);

  target.style.setProperty('--glass-ripple-x', `${x}px`);
  target.style.setProperty('--glass-ripple-y', `${y}px`);

  return { rect, x, y };
}

function getParticleLayer(target: HTMLElement, reset = false) {
  const currentLayer = target.querySelector(PARTICLE_LAYER_SELECTOR);
  if (currentLayer instanceof HTMLElement) {
    if (reset) {
      currentLayer.replaceChildren();
    }

    return currentLayer;
  }

  const nextLayer = document.createElement('span');
  nextLayer.className = 'glass-ripple-particles';
  nextLayer.setAttribute('aria-hidden', 'true');
  target.append(nextLayer);

  return nextLayer;
}

function trimParticleLayer(layer: HTMLElement) {
  while (layer.childElementCount > MAX_PARTICLES_PER_TARGET) {
    layer.firstElementChild?.remove();
  }
}

function scheduleParticleCleanup(particles: HTMLElement[], cleanupDelay: number) {
  window.setTimeout(() => {
    for (const particle of particles) {
      particle.remove();
    }
  }, cleanupDelay);
}

function emitParticleBurst(
  target: HTMLElement,
  rect: ControlRect,
  originX: number,
  originY: number,
  options: ParticleBurstOptions,
) {
  const layer = getParticleLayer(target, options.reset);
  const fragment = document.createDocumentFragment();
  const particles: HTMLElement[] = [];
  let cleanupDelay = 0;

  const shortestSide = Math.max(1, Math.min(rect.width, rect.height));
  const longestSide = Math.max(rect.width, rect.height);
  const aspectRatio = longestSide / shortestSide;
  const longAxisBoost = ratioBetween(aspectRatio, 1.25, 4.2);
  const maxX = Math.max(PARTICLE_SAFE_INSET_PX, rect.width - PARTICLE_SAFE_INSET_PX);
  const maxY = Math.max(PARTICLE_SAFE_INSET_PX, rect.height - PARTICLE_SAFE_INSET_PX);
  // Particle sizing follows control size so compact chips stay delicate while
  // larger CTA buttons get visible but still fine-grained points.
  // 粒子尺寸跟随控件大小：紧凑 chip 保持细腻，大 CTA 获得更清晰但仍细碎的光点。
  const particleSizeMin = clamp(shortestSide * 0.026, 1.1, 2.2);
  const particleSizeMax = clamp(shortestSide * 0.066 + longAxisBoost * 0.55, 2.4, 5.2);
  const minTravel = clamp(shortestSide * (0.2 + longAxisBoost * 0.06), 10, 30);

  for (let index = 0; index < options.count; index += 1) {
    const particle = document.createElement('span');
    const startX = clamp(
      originX + randomBetween(-PARTICLE_START_JITTER_PX, PARTICLE_START_JITTER_PX),
      PARTICLE_SAFE_INSET_PX,
      maxX,
    );
    const startY = clamp(
      originY + randomBetween(-PARTICLE_START_JITTER_PX, PARTICLE_START_JITTER_PX),
      PARTICLE_SAFE_INSET_PX,
      maxY,
    );
    const dragDirection = options.direction;
    const followsDrag = dragDirection !== undefined && Math.random() < 0.72;
    let angle = followsDrag
      ? dragDirection + randomBetween(-1.45, 1.45)
      : (index * PARTICLE_GOLDEN_ANGLE + randomBetween(-0.38, 0.38)) % PARTICLE_FULL_TURN;
    let edgeDistance = distanceToControlEdge(startX, startY, angle, rect.width, rect.height);

    if (edgeDistance < minTravel) {
      angle = (angle + Math.PI + randomBetween(-0.46, 0.46)) % PARTICLE_FULL_TURN;
      edgeDistance = distanceToControlEdge(startX, startY, angle, rect.width, rect.height);
    }

    const longAxisAlignment =
      rect.width >= rect.height ? Math.abs(Math.cos(angle)) : Math.abs(Math.sin(angle));
    const edgeRatio = clamp(
      randomBetween(0.7, 0.9) + longAxisAlignment * (0.1 + longAxisBoost * 0.14),
      0.72,
      0.98,
    );
    const travel =
      edgeDistance <= minTravel
        ? edgeDistance * randomBetween(0.82, 0.98)
        : edgeDistance * edgeRatio;
    const scaledDx = Math.cos(angle) * travel;
    const scaledDy = Math.sin(angle) * travel;
    const sway = randomBetween(-shortestSide * 0.2, shortestSide * 0.2);
    const midX = clamp(
      startX + scaledDx * 0.56 - Math.sin(angle) * sway,
      PARTICLE_SAFE_INSET_PX,
      maxX,
    );
    const midY = clamp(
      startY + scaledDy * 0.56 + Math.cos(angle) * sway,
      PARTICLE_SAFE_INSET_PX,
      maxY,
    );
    const alpha = randomBetween(0.52, 0.98);
    const particleDelay = randomBetween(0, 140);
    const particleDuration = randomBetween(980, 1480);

    particle.className = 'glass-ripple-particle';
    particle.style.setProperty('--glass-particle-x', `${startX}px`);
    particle.style.setProperty('--glass-particle-y', `${startY}px`);
    particle.style.setProperty('--glass-particle-mid-x', `${midX - startX}px`);
    particle.style.setProperty('--glass-particle-mid-y', `${midY - startY}px`);
    particle.style.setProperty('--glass-particle-end-x', `${scaledDx}px`);
    particle.style.setProperty('--glass-particle-end-y', `${scaledDy}px`);
    particle.style.setProperty(
      '--glass-particle-late-x',
      `${scaledDx * randomBetween(0.78, 0.9)}px`,
    );
    particle.style.setProperty(
      '--glass-particle-late-y',
      `${scaledDy * randomBetween(0.78, 0.9)}px`,
    );
    particle.style.setProperty(
      '--glass-particle-size',
      `${randomBetween(particleSizeMin, particleSizeMax)}px`,
    );
    particle.style.setProperty('--glass-particle-alpha', String(alpha));
    particle.style.setProperty(
      '--glass-particle-fade-alpha',
      String(alpha * randomBetween(0.26, 0.42)),
    );
    particle.style.setProperty('--glass-particle-delay', `${particleDelay}ms`);
    particle.style.setProperty('--glass-particle-duration', `${particleDuration}ms`);

    cleanupDelay = Math.max(cleanupDelay, particleDelay + particleDuration + 80);
    particles.push(particle);
    fragment.append(particle);
  }

  layer.append(fragment);
  trimParticleLayer(layer);
  scheduleParticleCleanup(particles, cleanupDelay);
}

export default function GlassRippleController() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sessions = new Map<number, RippleSession>();
    const timers = new WeakMap<HTMLElement, number>();

    const clearRipple = (target: HTMLElement, token: string) => {
      if (target.dataset.glassRippleToken !== token) {
        return;
      }

      const timer = timers.get(target);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timers.delete(target);
      }

      target.classList.remove('glass-ripple--active');
      target.classList.remove('glass-ripple--tracking');
      target.removeAttribute('data-glass-ripple');
      target.querySelector(PARTICLE_LAYER_SELECTOR)?.remove();
      target.style.removeProperty('--glass-ripple-x');
      target.style.removeProperty('--glass-ripple-y');
      delete target.dataset.glassRippleToken;
    };

    const scheduleClear = (target: HTMLElement, token: string) => {
      const previousTimer = timers.get(target);
      if (previousTimer !== undefined) {
        window.clearTimeout(previousTimer);
      }

      const timer = window.setTimeout(() => clearRipple(target, token), RIPPLE_DURATION_MS + 120);
      timers.set(target, timer);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      if (!(event.target instanceof Element)) {
        return;
      }

      const target = event.target.closest(RIPPLE_SELECTOR);
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.matches(':disabled, [aria-disabled="true"]')) {
        return;
      }

      const token = String(performance.now());
      const previousTimer = timers.get(target);
      const burstConfig = getBurstConfig(event.pointerType, target);
      const rect = readControlRect(target);

      if (previousTimer !== undefined) {
        window.clearTimeout(previousTimer);
      }

      target.dataset.glassRipple = 'true';
      target.dataset.glassRippleToken = token;
      target.classList.remove('glass-ripple--active');
      target.classList.add('glass-ripple--tracking');

      const { x, y } = resolveLocalPoint(target, rect, event.clientX, event.clientY);
      if (!reducedMotion.matches) {
        emitParticleBurst(target, rect, x, y, { count: burstConfig.initialCount, reset: true });
      }

      if (burstConfig.hasPointerCapture) {
        try {
          target.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture may fail if the element disconnects during navigation.
          // 如果元素在导航期间断开连接，指针捕获可能失败，忽略即可。
        }
      }

      // Force a style flush so rapid repeated clicks restart the same animation.
      // 强制刷新样式，确保连续快速点击时同一个动画能重新播放。
      void target.offsetWidth;

      sessions.set(event.pointerId, {
        dragCount: burstConfig.dragCount,
        emitDistance: burstConfig.emitDistance,
        emitInterval: burstConfig.emitInterval,
        hasPointerCapture: burstConfig.hasPointerCapture,
        lastEmitAt: performance.now(),
        lastX: event.clientX,
        lastY: event.clientY,
        rect,
        target,
        token,
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      const session = sessions.get(event.pointerId);
      if (!session || session.target.dataset.glassRippleToken !== session.token) {
        return;
      }

      const dx = event.clientX - session.lastX;
      const dy = event.clientY - session.lastY;
      const distance = Math.hypot(dx, dy);
      const now = performance.now();
      const { rect, x, y } = resolveLocalPoint(
        session.target,
        session.rect,
        event.clientX,
        event.clientY,
      );

      if (distance < session.emitDistance || now - session.lastEmitAt < session.emitInterval) {
        return;
      }

      const direction = Math.atan2(dy, dx);
      if (!reducedMotion.matches) {
        emitParticleBurst(session.target, rect, x, y, { count: session.dragCount, direction });
      }

      session.lastEmitAt = now;
      session.lastX = event.clientX;
      session.lastY = event.clientY;
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const session = sessions.get(event.pointerId);
      if (!session) {
        return;
      }

      sessions.delete(event.pointerId);

      if (session.target.dataset.glassRippleToken !== session.token) {
        return;
      }

      const dx = event.clientX - session.lastX;
      const dy = event.clientY - session.lastY;
      const direction = Math.hypot(dx, dy) > 0.5 ? Math.atan2(dy, dx) : undefined;
      const { rect, x, y } = resolveLocalPoint(
        session.target,
        session.rect,
        event.clientX,
        event.clientY,
      );

      if (!reducedMotion.matches) {
        emitParticleBurst(session.target, rect, x, y, { count: session.dragCount, direction });
      }

      if (session.hasPointerCapture) {
        try {
          session.target.releasePointerCapture(event.pointerId);
        } catch {
          // Capture can already be released by pointercancel or navigation.
          // pointercancel 或导航可能已释放捕获，忽略即可。
        }
      }

      session.target.classList.remove('glass-ripple--tracking');
      session.target.classList.remove('glass-ripple--active');
      void session.target.offsetWidth;
      session.target.classList.add('glass-ripple--active');
      scheduleClear(session.target, session.token);
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true });
    document.addEventListener('pointermove', handlePointerMove, { capture: true });
    document.addEventListener('pointerup', handlePointerEnd, { capture: true });
    document.addEventListener('pointercancel', handlePointerEnd, { capture: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('pointermove', handlePointerMove, { capture: true });
      document.removeEventListener('pointerup', handlePointerEnd, { capture: true });
      document.removeEventListener('pointercancel', handlePointerEnd, { capture: true });
    };
  }, []);

  return null;
}
