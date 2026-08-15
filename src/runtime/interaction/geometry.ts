// Geometry-only helpers: bounds, radius, inset pseudo-surface translation,
// containment tests, and local coordinate mapping. This module never learns
// Fumadocs specifics — callers pick the geometry mode from the
// registry-resolved contract result.
// 纯几何辅助：边界、圆角、内缩伪表面换算、包含测试与本地坐标映射。
// 本模块不感知 Fumadocs 细节 —— 几何模式由调用方从注册表解析的契约结果中取得。

import type { GeometryMode, InteractionGeometry, InteractionRect } from './types';

export const PARTICLE_SAFE_INSET_PX = 4;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function ratioBetween(value: number, min: number, max: number) {
  return max <= min ? 0 : clamp((value - min) / (max - min), 0, 1);
}

function parseInset(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function readInteractionGeometry(
  target: HTMLElement,
  mode: GeometryMode,
): InteractionGeometry {
  const targetRect = target.getBoundingClientRect();
  if (mode !== 'inset-before') {
    const targetStyle = getComputedStyle(target);
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

  // The visible surface is an inset ::before glass bar. Read its computed
  // geometry so particles use the bar, not the surrounding padded box.
  // 可见表面是内缩 ::before 玻璃条；读取其计算几何，使粒子边界落在条内而非宿主留白盒。
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

export function pointIsInside(rect: InteractionRect, clientX: number, clientY: number) {
  return (
    clientX >= rect.left &&
    clientX <= rect.left + rect.width &&
    clientY >= rect.top &&
    clientY <= rect.top + rect.height
  );
}

export function toLocalPoint(rect: InteractionRect, clientX: number, clientY: number) {
  return {
    x: clamp(clientX - rect.left, PARTICLE_SAFE_INSET_PX, rect.width - PARTICLE_SAFE_INSET_PX),
    y: clamp(clientY - rect.top, PARTICLE_SAFE_INSET_PX, rect.height - PARTICLE_SAFE_INSET_PX),
  };
}

export function distanceToEdge(x: number, y: number, angle: number, width: number, height: number) {
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
