// HarmonyOS-inspired particle controller emits small round photons continuously
// along pointer paths with responsive density and smooth outward drift.
// HarmonyOS 风格粒子控制器：沿指针路径连续生成小型圆点光子，并提供响应式密度与平滑外散。
'use client';

import { useEffect } from 'react';
import { MOTION_DURATION_MS, prefersReducedMotion } from '@/lib/motion-config';

// Mobile sidebar's GitHub action is an anchor rather than a button, so include
// only that utility link in the shared particle interaction system.
// 移动侧栏 GitHub 操作是链接而非按钮，因此仅将该工具链接补入共享粒子交互系统。
const MOBILE_SIDEBAR_UTILITY_LINK_SELECTOR =
  '#nd-sidebar-mobile > div:first-child > div.flex > div:first-child > a';

const CONTROL_SELECTOR = [
  '.control-surface',
  '.chapter-card',
  '.mdx-doc-card',
  '[data-card="true"]',
  '.glass-interactive',
  '.glass-interactive--chip',
  '.glass-cta',
  '#nd-nav button',
  '#nd-sidebar button',
  '#nd-sidebar-mobile button',
  MOBILE_SIDEBAR_UTILITY_LINK_SELECTOR,
  '#nd-docs-layout header button',
  '#nd-docs-layout > div.fixed.flex button',
  '[role="dialog"] button',
  '[data-radix-popper-content-wrapper] button',
  '[data-toc-popover-trigger]',
  '.mermaid-toolbar button',
].join(',');

// The whole sidebar footer is one shared interaction surface even when the
// pointer starts on a nested theme/language button.
// 侧栏底部工具栏是一个整体交互表面，即使从内部主题/语言按钮点击也由整栏承载粒子。
const SIDEBAR_FOOTER_PARTICLE_HOST_SELECTOR =
  '#nd-sidebar > div:has(> button[aria-haspopup="dialog"]):has(> div > button[data-theme-toggle])';
const CODE_TABS_PARTICLE_HOST_SELECTOR =
  '#nd-page div[data-orientation]:has(> [role="tablist"]):has(> [role="tabpanel"])';
const MOBILE_TITLE_PARTICLE_HOST_SELECTOR =
  '#nd-docs-layout > div.sticky header.border-b.backdrop-blur-sm';

const SURFACE_SELECTOR = [
  '.surface-panel',
  '.capability-row',
  '.guestbook-page__surface',
  '.glass-codeblock',
  '.mermaid-wrapper:not([data-maximized])',
  '.markdown-alert',
  '.markdown-details',
  CODE_TABS_PARTICLE_HOST_SELECTOR,
  MOBILE_TITLE_PARTICLE_HOST_SELECTOR,
  ':where(#nd-page) :where(.prose-no-margin):has(> table)',
  SIDEBAR_FOOTER_PARTICLE_HOST_SELECTOR,
].join(',');

const INTERACTIVE_SELECTOR = `${CONTROL_SELECTOR},${SURFACE_SELECTOR}`;
const PARTICLE_LAYER_SELECTOR = ':scope > .immersive-particle-layer';
const FEEDBACK_LIFETIME_MS = MOTION_DURATION_MS.particleField + 400;
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
const PARTICLE_SAFE_INSET_PX = 4;
const PARTICLE_START_JITTER_PX = 3;
const INITIAL_BURST_SPREAD_RATIO = 0.12;
const CTA_INITIAL_BURST_SPREAD_RATIO = 0.055;
const PARTICLE_FULL_TURN = Math.PI * 2;
const MAX_INTERPOLATED_STEPS = 14;

interface ControlRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface ParticleGeometry {
  radius: string;
  rect: ControlRect;
}

interface ParticleSession {
  dragCount: number;
  emitDistance: number;
  lastX: number;
  lastY: number;
  rect: ControlRect;
  target: HTMLElement;
  token: string;
}

interface PendingMove {
  clientX: number;
  clientY: number;
  pointerId: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function ratioBetween(value: number, min: number, max: number) {
  return max <= min ? 0 : clamp((value - min) / (max - min), 0, 1);
}

function parseInset(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readParticleGeometry(target: HTMLElement): ParticleGeometry {
  const targetRect = target.getBoundingClientRect();
  const targetStyle = getComputedStyle(target);
  if (!target.matches(SIDEBAR_FOOTER_PARTICLE_HOST_SELECTOR)) {
    return {
      radius: targetStyle.borderRadius,
      rect: {
        height: targetRect.height,
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
      },
    };
  }

  // The visible sidebar footer is an inset ::before glass bar. Read its
  // computed geometry so particles use the bar, not the padded footer box.
  // 侧栏页脚的可见表面是内缩 ::before 玻璃条，粒子边界应读取该条而非页脚留白盒。
  const surfaceStyle = getComputedStyle(target, '::before');
  const top = parseInset(surfaceStyle.top);
  const right = parseInset(surfaceStyle.right);
  const bottom = parseInset(surfaceStyle.bottom);
  const left = parseInset(surfaceStyle.left);
  return {
    radius: surfaceStyle.borderRadius,
    rect: {
      height: Math.max(1, targetRect.height - top - bottom),
      left: targetRect.left + left,
      top: targetRect.top + top,
      width: Math.max(1, targetRect.width - left - right),
    },
  };
}

function pointIsInside(rect: ControlRect, clientX: number, clientY: number) {
  return (
    clientX >= rect.left &&
    clientX <= rect.left + rect.width &&
    clientY >= rect.top &&
    clientY <= rect.top + rect.height
  );
}

function localPoint(rect: ControlRect, clientX: number, clientY: number) {
  return {
    x: clamp(clientX - rect.left, PARTICLE_SAFE_INSET_PX, rect.width - PARTICLE_SAFE_INSET_PX),
    y: clamp(clientY - rect.top, PARTICLE_SAFE_INSET_PX, rect.height - PARTICLE_SAFE_INSET_PX),
  };
}

function distanceToEdge(x: number, y: number, angle: number, width: number, height: number) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const maxX =
    Math.abs(cosine) < 0.001
      ? Number.POSITIVE_INFINITY
      : cosine > 0
        ? (width - PARTICLE_SAFE_INSET_PX - x) / cosine
        : (x - PARTICLE_SAFE_INSET_PX) / Math.abs(cosine);
  const maxY =
    Math.abs(sine) < 0.001
      ? Number.POSITIVE_INFINITY
      : sine > 0
        ? (height - PARTICLE_SAFE_INSET_PX - y) / sine
        : (y - PARTICLE_SAFE_INSET_PX) / Math.abs(sine);
  return Math.max(0, Math.min(maxX, maxY));
}

function getLayer(target: HTMLElement, rect: ControlRect, reset = false) {
  const existing = target.querySelector(PARTICLE_LAYER_SELECTOR);
  const targetRect = target.getBoundingClientRect();
  const applyBounds = (layer: HTMLElement) => {
    layer.style.insetBlockStart = `${rect.top - targetRect.top}px`;
    layer.style.insetInlineEnd = `${targetRect.right - (rect.left + rect.width)}px`;
    layer.style.insetBlockEnd = `${targetRect.bottom - (rect.top + rect.height)}px`;
    layer.style.insetInlineStart = `${rect.left - targetRect.left}px`;
  };
  if (existing instanceof HTMLElement) {
    if (reset) existing.replaceChildren();
    applyBounds(existing);
    return existing;
  }

  const layer = document.createElement('span');
  layer.className = 'immersive-particle-layer';
  layer.setAttribute('aria-hidden', 'true');
  // Contain the particle layer's repaint scope and hint the compositor so
  // bursts animate on the GPU without triggering reflow on the host page.
  // The hints live only for the layer's lifetime and are cleared on removal.
  // 隔离粒子层的重绘范围并提示合成层，使粒子在 GPU 上动画而不触发宿主页面的 reflow。
  // 这些提示仅在层存活期间生效，移除时清理。
  layer.style.contain = 'layout style paint';
  layer.style.willChange = 'transform, opacity';
  applyBounds(layer);
  target.append(layer);
  return layer;
}

function trimLayer(layer: HTMLElement) {
  while (layer.childElementCount > MAX_PARTICLES_PER_TARGET) {
    layer.firstElementChild?.remove();
  }
}

function burstConfig(pointerType: string, target: HTMLElement) {
  const touchLike = pointerType === 'touch' || pointerType === 'pen';
  const surface = target.matches(SURFACE_SELECTOR);
  if (surface) {
    return {
      dragCount: touchLike ? TOUCH_SURFACE_DRAG_PARTICLE_COUNT : SURFACE_DRAG_PARTICLE_COUNT,
      emitDistance: touchLike ? TOUCH_SURFACE_DRAG_EMIT_DISTANCE_PX : SURFACE_DRAG_EMIT_DISTANCE_PX,
      initialCount: touchLike
        ? TOUCH_SURFACE_INITIAL_PARTICLE_COUNT
        : SURFACE_INITIAL_PARTICLE_COUNT,
    };
  }

  return {
    dragCount: touchLike ? TOUCH_DRAG_PARTICLE_COUNT : DRAG_PARTICLE_COUNT,
    emitDistance: touchLike ? TOUCH_DRAG_EMIT_DISTANCE_PX : DRAG_EMIT_DISTANCE_PX,
    initialCount: touchLike ? TOUCH_INITIAL_PARTICLE_COUNT : INITIAL_PARTICLE_COUNT,
  };
}

function emitBurst(
  target: HTMLElement,
  rect: ControlRect,
  originX: number,
  originY: number,
  count: number,
  direction?: number,
  reset = false,
) {
  const layer = getLayer(target, rect, reset);
  layer.style.setProperty('--immersive-x', `${originX}px`);
  layer.style.setProperty('--immersive-y', `${originY}px`);
  const fragment = document.createDocumentFragment();
  const particles: HTMLElement[] = [];
  const shortestSide = Math.max(1, Math.min(rect.width, rect.height));
  const longestSide = Math.max(rect.width, rect.height);
  const longAxisBoost = ratioBetween(longestSide / shortestSide, 1.25, 4.2);
  const maxX = Math.max(PARTICLE_SAFE_INSET_PX, rect.width - PARTICLE_SAFE_INSET_PX);
  const maxY = Math.max(PARTICLE_SAFE_INSET_PX, rect.height - PARTICLE_SAFE_INSET_PX);
  const sizeMin = clamp(shortestSide * 0.032, 1.4, 2.8);
  const sizeMax = clamp(shortestSide * 0.064 + longAxisBoost * 0.5, 2.8, 5.4);
  // The homepage CTA starts from a tighter ring so its compact button does not
  // look fully expanded on the first frame, while other surfaces keep their scale.
  // 首页 CTA 使用更紧凑的出生圆环，避免小按钮首帧看起来已经完全拓开；其他表面保持原比例。
  const initialSpread = target.matches('.home-cta')
    ? clamp(shortestSide * CTA_INITIAL_BURST_SPREAD_RATIO, 2.5, 6)
    : clamp(shortestSide * INITIAL_BURST_SPREAD_RATIO, 5, 14);
  const minTravel = clamp(shortestSide * (0.2 + longAxisBoost * 0.06), 10, 30);
  const travelCap = clamp(shortestSide * 0.62, 24, 72);
  let cleanupDelay = 0;

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('span');
    // Initial clicks distribute particles around a compact ring immediately,
    // preventing all dots from stacking into one bright point before scattering.
    // 首次点击让粒子立即分布在小型环带上，避免所有圆点先叠成一个亮点再散开。
    const initialAngle =
      direction === undefined
        ? (index / Math.max(1, count)) * PARTICLE_FULL_TURN + randomBetween(-0.22, 0.22)
        : 0;
    const initialDistance = direction === undefined ? initialSpread * randomBetween(0.48, 1) : 0;
    const startX = clamp(
      originX +
        Math.cos(initialAngle) * initialDistance +
        randomBetween(-PARTICLE_START_JITTER_PX, PARTICLE_START_JITTER_PX),
      PARTICLE_SAFE_INSET_PX,
      maxX,
    );
    const startY = clamp(
      originY +
        Math.sin(initialAngle) * initialDistance +
        randomBetween(-PARTICLE_START_JITTER_PX, PARTICLE_START_JITTER_PX),
      PARTICLE_SAFE_INSET_PX,
      maxY,
    );
    const followsDrag = direction !== undefined && Math.random() < 0.28;
    let angle = followsDrag
      ? direction + randomBetween(-1.85, 1.85)
      : randomBetween(0, PARTICLE_FULL_TURN);
    let edgeDistance = distanceToEdge(startX, startY, angle, rect.width, rect.height);
    if (edgeDistance < minTravel) {
      angle = (angle + Math.PI + randomBetween(-0.46, 0.46)) % PARTICLE_FULL_TURN;
      edgeDistance = distanceToEdge(startX, startY, angle, rect.width, rect.height);
    }

    const alignment =
      rect.width >= rect.height ? Math.abs(Math.cos(angle)) : Math.abs(Math.sin(angle));
    const edgeRatio = clamp(
      randomBetween(0.7, 0.9) + alignment * (0.1 + longAxisBoost * 0.14),
      0.72,
      0.98,
    );
    const edgeTravel =
      edgeDistance <= minTravel
        ? edgeDistance * randomBetween(0.82, 0.98)
        : edgeDistance * edgeRatio;
    const travel = Math.min(edgeTravel, travelCap * randomBetween(0.72, 1.08));
    const dx = Math.cos(angle) * travel;
    const dy = Math.sin(angle) * travel;
    const sway = randomBetween(-shortestSide * 0.12, shortestSide * 0.12);
    const midX = clamp(startX + dx * 0.56 - Math.sin(angle) * sway, PARTICLE_SAFE_INSET_PX, maxX);
    const midY = clamp(startY + dy * 0.56 + Math.cos(angle) * sway, PARTICLE_SAFE_INSET_PX, maxY);
    const alpha = randomBetween(0.42, 0.82);
    const delay = 0;
    const duration = randomBetween(MOTION_DURATION_MS.particleMin, MOTION_DURATION_MS.particleMax);

    particle.className = 'immersive-particle';
    // Batch all CSS custom properties into a single style assignment to
    // minimize style-recalc cost when many particles are emitted per frame.
    // 将所有 CSS 自定义属性合并为单次 style 赋值，减少每帧大量粒子发射时的样式重算开销。
    particle.style.cssText = `--particle-start-x:${startX}px;--particle-start-y:${startY}px;--particle-mid-x:${midX - startX}px;--particle-mid-y:${midY - startY}px;--particle-late-x:${dx * randomBetween(0.78, 0.9)}px;--particle-late-y:${dy * randomBetween(0.78, 0.9)}px;--particle-end-x:${dx}px;--particle-end-y:${dy}px;--particle-size:${randomBetween(sizeMin, sizeMax)}px;--particle-alpha:${alpha};--particle-fade-alpha:${alpha * randomBetween(0.26, 0.42)};--particle-delay:${delay}ms;--particle-duration:${duration}ms;`;
    cleanupDelay = Math.max(cleanupDelay, delay + duration + 80);
    particles.push(particle);
    fragment.append(particle);
  }

  layer.append(fragment);
  trimLayer(layer);
  window.setTimeout(() => {
    for (const particle of particles) particle.remove();
  }, cleanupDelay);
}

export function ImmersiveInteractionController() {
  useEffect(() => {
    const sessions = new Map<number, ParticleSession>();
    const pendingMoves = new Map<number, PendingMove>();
    const cleanupTimers = new WeakMap<HTMLElement, number>();
    let frameId = 0;

    const clearTarget = (target: HTMLElement, token: string) => {
      if (target.dataset.immersiveToken !== token) return;
      target.classList.remove('immersive--active', 'immersive--tracking');
      target.removeAttribute('data-immersive-active');
      const layer = target.querySelector<HTMLElement>(PARTICLE_LAYER_SELECTOR);
      if (layer) {
        // Release compositor hints acquired in getLayer so GPU memory is freed
        // once the particle layer is no longer needed.
        // 释放 getLayer 中获取的合成层提示，粒子层不再需要时释放 GPU 内存。
        layer.style.willChange = '';
        layer.style.contain = '';
        layer.remove();
      }
      delete target.dataset.immersiveToken;
    };

    const scheduleClear = (target: HTMLElement, token: string) => {
      const existing = cleanupTimers.get(target);
      if (existing) window.clearTimeout(existing);
      cleanupTimers.set(
        target,
        window.setTimeout(() => clearTarget(target, token), FEEDBACK_LIFETIME_MS),
      );
    };

    const processMoves = () => {
      frameId = 0;
      for (const move of pendingMoves.values()) {
        const session = sessions.get(move.pointerId);
        if (!session || session.target.dataset.immersiveToken !== session.token) continue;
        const dx = move.clientX - session.lastX;
        const dy = move.clientY - session.lastY;
        const distance = Math.hypot(dx, dy);
        if (
          !pointIsInside(session.rect, move.clientX, move.clientY) ||
          distance < session.emitDistance
        ) {
          continue;
        }

        const steps = Math.min(
          MAX_INTERPOLATED_STEPS,
          Math.max(1, Math.floor(distance / session.emitDistance)),
        );
        if (!prefersReducedMotion()) {
          for (let step = 1; step <= steps; step += 1) {
            const ratio = step / steps;
            const point = localPoint(
              session.rect,
              session.lastX + dx * ratio,
              session.lastY + dy * ratio,
            );
            emitBurst(
              session.target,
              session.rect,
              point.x,
              point.y,
              session.dragCount,
              Math.atan2(dy, dx),
            );
          }
        }
        session.lastX = move.clientX;
        session.lastY = move.clientY;
      }
      pendingMoves.clear();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const source = event.target instanceof Element ? event.target : null;
      // Prefer the shared sidebar-footer host over its nested buttons so one
      // click produces a coherent full-width particle field.
      // 侧栏页脚优先使用整栏宿主，避免粒子只局限在内部小按钮中。
      const target =
        source?.closest<HTMLElement>(SIDEBAR_FOOTER_PARTICLE_HOST_SELECTOR) ??
        source?.closest<HTMLElement>(CODE_TABS_PARTICLE_HOST_SELECTOR) ??
        source?.closest<HTMLElement>(MOBILE_TITLE_PARTICLE_HOST_SELECTOR) ??
        source?.closest<HTMLElement>(INTERACTIVE_SELECTOR);
      if (!target || target.matches(':disabled, [aria-disabled="true"]')) return;

      const geometry = readParticleGeometry(target);
      const rect = geometry.rect;
      // Inset pseudo-element surfaces should only react inside their visible
      // glass bar, not in the surrounding layout padding.
      // 内缩伪元素表面只在可见玻璃条内响应，外层布局留白不触发粒子。
      if (
        target.matches(SIDEBAR_FOOTER_PARTICLE_HOST_SELECTOR) &&
        !pointIsInside(rect, event.clientX, event.clientY)
      ) {
        return;
      }
      const point = localPoint(rect, event.clientX, event.clientY);
      const config = burstConfig(event.pointerType, target);
      const token = String(performance.now());
      target.dataset.immersiveActive = 'true';
      target.dataset.immersiveToken = token;
      target.classList.remove('immersive--active');
      target.classList.add('immersive--tracking');
      target.style.setProperty('--immersive-radius', geometry.radius);
      if (!prefersReducedMotion()) {
        emitBurst(target, rect, point.x, point.y, config.initialCount, undefined, true);
      }

      sessions.set(event.pointerId, {
        ...config,
        lastX: event.clientX,
        lastY: event.clientY,
        rect,
        target,
        token,
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!sessions.has(event.pointerId)) return;
      pendingMoves.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
        pointerId: event.pointerId,
      });
      if (!frameId) frameId = window.requestAnimationFrame(processMoves);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const session = sessions.get(event.pointerId);
      if (!session) return;
      sessions.delete(event.pointerId);
      pendingMoves.delete(event.pointerId);
      if (session.target.dataset.immersiveToken !== session.token) return;

      session.target.classList.remove('immersive--tracking', 'immersive--active');
      void session.target.offsetWidth;
      session.target.classList.add('immersive--active');
      scheduleClear(session.target, session.token);
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true });
    document.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true });
    document.addEventListener('pointerup', handlePointerEnd, { capture: true });
    document.addEventListener('pointercancel', handlePointerEnd, { capture: true });

    // Pause RAF work while the tab is hidden so background pages do not keep
    // accumulating particle move events or scheduling frames. Sessions are
    // preserved so an in-flight drag resumes cleanly on focus.
    // 标签页隐藏时暂停 RAF，避免后台页面持续累积移动事件与帧调度。
    // 会话保留以便拖拽中断后焦点恢复时继续。
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (frameId) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }
        pendingMoves.clear();
      }
    };

    // pagehide (covers bfcache eviction + unload): drop every session so a
    // returning user never inherits stale particle layers from the prior visit.
    // pagehide（覆盖 bfcache 驱逐与卸载）：丢弃所有会话，避免用户返回时
    // 继承上次访问残留的粒子层。
    const handlePageHide = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      pendingMoves.clear();
      for (const [, session] of sessions) {
        session.target.classList.remove('immersive--active', 'immersive--tracking');
        session.target.removeAttribute('data-immersive-active');
        const layer = session.target.querySelector<HTMLElement>(PARTICLE_LAYER_SELECTOR);
        if (layer) {
          layer.style.willChange = '';
          layer.style.contain = '';
          layer.remove();
        }
        delete session.target.dataset.immersiveToken;
      }
      sessions.clear();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('pointermove', handlePointerMove, { capture: true });
      document.removeEventListener('pointerup', handlePointerEnd, { capture: true });
      document.removeEventListener('pointercancel', handlePointerEnd, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return null;
}
