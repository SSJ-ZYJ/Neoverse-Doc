// HarmonyOS-inspired interaction controller: receives pointer events,
// resolves semantic targets through the registry, drives pointer sessions,
// and delegates emission to the particle engine. Geometry, budgets, and DOM
// creation live in their dedicated modules.
// HarmonyOS 风格交互控制器：接收指针事件，经注册表解析语义目标，
// 驱动指针会话，并将发射委托给粒子引擎。几何、预算与 DOM 创建
// 分别由各自模块承担。
'use client';

import { useEffect } from 'react';
import { MOTION_DURATION_MS, prefersReducedMotion } from '@/runtime/motion/config';
import { pointIsInside, readInteractionGeometry, toLocalPoint } from './geometry';
import { emitBursts, releaseTargetLayer } from './particle-emitter';
import { resolveParticlePolicy } from './particle-policy';
import { createPointerSessionStore } from './pointer-session';
import { resolveInteractionTarget } from './registry';

const NATIVE_PARTICLE_SCROLL_SELECTOR = '[data-particle-scroll-native]';
const FEEDBACK_LIFETIME_MS = MOTION_DURATION_MS.particleField + 400;

export function ImmersiveInteractionController() {
  useEffect(() => {
    const cleanupTimers = new WeakMap<HTMLElement, number>();
    const sessions = createPointerSessionStore((session, emissions) => {
      emitBursts(session.target, session.rect, emissions, session.policy);
    });

    const clearTarget = (target: HTMLElement, token: string) => {
      if (target.dataset.immersiveToken !== token) return;
      target.classList.remove('immersive--active', 'immersive--tracking');
      target.removeAttribute('data-immersive-active');
      releaseTargetLayer(target);
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

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const source = event.target instanceof Element ? event.target : null;
      const resolved = resolveInteractionTarget(source);
      if (!resolved) return;
      if (prefersReducedMotion()) return;

      // Chromium can crash when a navigation unmounts an HTML-in-Canvas subtree
      // while composited particle descendants are still attached to its link.
      // Skip transient feedback for every pointer type before mutating that
      // experimental subtree; non-navigation controls retain the full effect.
      // 当导航卸载 HTML-in-Canvas 子树时，若链接内仍挂载合成粒子后代，
      // Chromium 可能崩溃。因此所有指针类型都在修改实验性子树前跳过该
      // 瞬时反馈；非导航控件仍保留完整效果。
      const nativeCanvasNavigation = source
        ?.closest('a[href]')
        ?.closest(NATIVE_PARTICLE_SCROLL_SELECTOR);
      if (nativeCanvasNavigation) return;

      const geometry = readInteractionGeometry(resolved.target, resolved.geometryMode);
      // Inset pseudo-element surfaces should only react inside their visible
      // glass bar, not in the surrounding layout padding.
      // 内缩伪元素表面只在可见玻璃条内响应，外层布局留白不触发粒子。
      if (
        resolved.geometryMode === 'inset-before' &&
        !pointIsInside(geometry.rect, event.clientX, event.clientY)
      ) {
        return;
      }

      const point = toLocalPoint(geometry.rect, event.clientX, event.clientY);
      const policy = resolveParticlePolicy(resolved.kind, event.pointerType);
      const token = String(performance.now());
      const { target } = resolved;
      target.dataset.immersiveActive = 'true';
      target.dataset.immersiveToken = token;
      target.classList.remove('immersive--active');
      target.classList.add('immersive--tracking');
      target.style.setProperty('--immersive-radius', geometry.radius);
      emitBursts(
        target,
        geometry.rect,
        [{ count: policy.initialCount, originX: point.x, originY: point.y }],
        policy,
        true,
      );

      sessions.start(event.pointerId, {
        lastX: event.clientX,
        lastY: event.clientY,
        policy,
        rect: geometry.rect,
        target,
        token,
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!sessions.has(event.pointerId)) return;
      sessions.queueMove(event);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const session = sessions.end(event.pointerId);
      if (!session) return;
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
    // preserved so an in-flight drag resumes cleanly on focus. The data-page-hidden
    // attribute also pauses pure-CSS infinite animations (home ambient drift,
    // network pulse, CTA refraction) via [data-page-hidden] selectors in CSS,
    // since those are compositor-driven and not covered by RAF pausing.
    // 标签页隐藏时暂停 RAF，避免后台页面持续累积移动事件与帧调度。
    // 会话保留以便拖拽中断后焦点恢复时继续。data-page-hidden 属性还通过
    // CSS 中的 [data-page-hidden] 选择器暂停纯 CSS 无限动画（主页环境光
    // 漂移、网格脉冲、CTA 折射），因为它们由合成器驱动，RAF 暂停不覆盖。
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sessions.pauseFrames();
        document.documentElement.dataset.pageHidden = '';
      } else {
        delete document.documentElement.dataset.pageHidden;
      }
    };

    // pagehide (covers bfcache eviction + unload): drop every session so a
    // returning user never inherits stale particle layers from the prior visit.
    // pagehide（覆盖 bfcache 驱逐与卸载）：丢弃所有会话，避免用户返回时
    // 继承上次访问残留的粒子层。
    const handlePageHide = () => {
      sessions.pauseFrames();
      sessions.forEach((session) => {
        clearTarget(session.target, session.token);
      });
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
      sessions.pauseFrames();
      sessions.clear();
      // Ensure data-page-hidden is cleared if the component unmounts while hidden.
      // 确保组件在隐藏状态下卸载时清除 data-page-hidden。
      delete document.documentElement.dataset.pageHidden;
    };
  }, []);

  return null;
}
