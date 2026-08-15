// Particle emission engine: owns the per-target particle layer lifecycle and
// turns planned emissions into animated DOM particles. Visual scattering
// math lives here; budgets and travel scaling come from the particle policy.
// 粒子发射引擎：负责每个目标的粒子层生命周期，并把发射计划转换为
// 动画 DOM 粒子。视觉散布数学在此实现；数量预算与行程缩放来自粒子策略。

import { MOTION_DURATION_MS } from '@/runtime/motion/config';
import {
  clamp,
  distanceToEdge,
  PARTICLE_SAFE_INSET_PX,
  randomBetween,
  ratioBetween,
} from './geometry';
import type { InteractionRect, ParticleEmission, ParticlePolicy } from './types';

const PARTICLE_LAYER_SELECTOR = ':scope > .immersive-particle-layer';
const PARTICLE_START_JITTER_PX = 3;
const PARTICLE_FULL_TURN = Math.PI * 2;

function getLayer(target: HTMLElement, rect: InteractionRect, reset = false) {
  const existing = target.querySelector(PARTICLE_LAYER_SELECTOR);
  // Drag frames reuse the bounds measured at pointer-down; returning before a
  // new layout read prevents read/write thrashing across interpolated bursts.
  // 拖动帧复用按下时测得的边界；在再次读取布局前返回，避免插值粒子批次
  // 反复交错读写布局。
  if (existing instanceof HTMLElement && !reset) return existing;

  const targetRect = target.getBoundingClientRect();
  const applyBounds = (layer: HTMLElement) => {
    layer.style.insetBlockStart = `${rect.top - targetRect.top}px`;
    layer.style.insetInlineEnd = `${targetRect.right - (rect.left + rect.width)}px`;
    layer.style.insetBlockEnd = `${targetRect.bottom - (rect.top + rect.height)}px`;
    layer.style.insetInlineStart = `${rect.left - targetRect.left}px`;
  };
  if (existing instanceof HTMLElement) {
    existing.replaceChildren();
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

function trimLayer(layer: HTMLElement, maxParticles: number) {
  while (layer.childElementCount > maxParticles) {
    layer.firstElementChild?.remove();
  }
}

// Release compositor hints acquired in getLayer and detach the layer so GPU
// memory is freed once a target's feedback is no longer needed.
// 释放 getLayer 中获取的合成层提示并移除粒子层，目标反馈不再需要时释放 GPU 内存。
export function releaseTargetLayer(target: HTMLElement) {
  const layer = target.querySelector<HTMLElement>(PARTICLE_LAYER_SELECTOR);
  if (!layer) return;
  layer.style.willChange = '';
  layer.style.contain = '';
  layer.remove();
}

export function emitBursts(
  target: HTMLElement,
  rect: InteractionRect,
  emissions: ParticleEmission[],
  policy: ParticlePolicy,
  reset = false,
) {
  const lastEmission = emissions[emissions.length - 1];
  if (!lastEmission) return;

  const layer = getLayer(target, rect, reset);
  layer.style.setProperty('--immersive-x', `${lastEmission.originX}px`);
  layer.style.setProperty('--immersive-y', `${lastEmission.originY}px`);
  const fragment = document.createDocumentFragment();
  const particles: HTMLElement[] = [];
  const shortestSide = Math.max(1, Math.min(rect.width, rect.height));
  const longestSide = Math.max(rect.width, rect.height);
  const longAxisBoost = ratioBetween(longestSide / shortestSide, 1.25, 4.2);
  const maxX = Math.max(PARTICLE_SAFE_INSET_PX, rect.width - PARTICLE_SAFE_INSET_PX);
  const maxY = Math.max(PARTICLE_SAFE_INSET_PX, rect.height - PARTICLE_SAFE_INSET_PX);
  const sizeMin = clamp(shortestSide * 0.032, 1.4, 2.8);
  const sizeMax = clamp(shortestSide * 0.064 + longAxisBoost * 0.5, 2.8, 5.4);
  const initialSpread =
    clamp(
      shortestSide * policy.initialSpreadRatio,
      policy.initialSpreadMin,
      policy.initialSpreadMax,
    ) * policy.travelScale;
  const minTravel = clamp(shortestSide * (0.2 + longAxisBoost * 0.06), 10, 30);
  const travelCap = clamp(shortestSide * 0.62, 24, 72) * policy.travelScale;
  let cleanupDelay = 0;

  // Interpolated pointer samples share one fragment, append, trim, and cleanup
  // timer per animation frame while preserving every generated particle.
  // 同一动画帧的插值指针采样共享一次 fragment、挂载、裁剪与清理计时，
  // 同时保留原有的每一颗粒子。
  for (const { originX, originY, count, direction } of emissions) {
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
      const sway = randomBetween(-shortestSide * 0.12, shortestSide * 0.12) * policy.travelScale;
      const midX = clamp(startX + dx * 0.56 - Math.sin(angle) * sway, PARTICLE_SAFE_INSET_PX, maxX);
      const midY = clamp(startY + dy * 0.56 + Math.cos(angle) * sway, PARTICLE_SAFE_INSET_PX, maxY);
      const alpha = randomBetween(0.42, 0.82);
      const delay = 0;
      const duration = randomBetween(
        MOTION_DURATION_MS.particleMin,
        MOTION_DURATION_MS.particleMax,
      );

      particle.className = 'immersive-particle';
      // Batch all CSS custom properties into a single style assignment to
      // minimize style-recalc cost when many particles are emitted per frame.
      // 将所有 CSS 自定义属性合并为单次 style 赋值，减少每帧大量粒子发射时的样式重算开销。
      particle.style.cssText = `--particle-start-x:${startX}px;--particle-start-y:${startY}px;--particle-mid-x:${midX - startX}px;--particle-mid-y:${midY - startY}px;--particle-late-x:${dx * randomBetween(0.78, 0.9)}px;--particle-late-y:${dy * randomBetween(0.78, 0.9)}px;--particle-end-x:${dx}px;--particle-end-y:${dy}px;--particle-size:${randomBetween(sizeMin, sizeMax)}px;--particle-alpha:${alpha};--particle-fade-alpha:${alpha * randomBetween(0.26, 0.42)};--particle-delay:${delay}ms;--particle-duration:${duration}ms;`;
      cleanupDelay = Math.max(cleanupDelay, delay + duration + 80);
      particles.push(particle);
      fragment.append(particle);
    }
  }

  layer.append(fragment);
  trimLayer(layer, policy.maxParticles);
  window.setTimeout(() => {
    for (const particle of particles) particle.remove();
  }, cleanupDelay);
}
