// Homepage ambient motion controller keeps every CSS effect and easing curve
// while sampling continuous document-timeline animations through one shared clock.
// 首页环境动效控制器保留全部 CSS 视效与缓动曲线，并通过共享时钟统一采样持续动画。
'use client';

import { type ReactNode, useEffect } from 'react';
import { useMotionPreferences } from '@/components/motion-preferences-provider';
import { MOTION_FRAME_RATE } from '@/lib/motion-config';

const MILLISECONDS_PER_SECOND = 1_000;
const HOME_AMBIENT_FRAME_INTERVAL_MS = MILLISECONDS_PER_SECOND / MOTION_FRAME_RATE.homepageAmbient;
const HOME_AMBIENT_ANIMATION_NAMES = new Set([
  'nd-ambient-drift',
  'nd-ray-drift',
  'nd-network-pulse',
  'nd-cta-refraction',
  'nd-ai-core-pulse',
]);

interface AmbientAnimationState {
  animation: CSSAnimation;
  capturedAt: number;
  currentTime: number;
}

interface AmbientMotionControllerProps {
  children: ReactNode;
}

function readCurrentTime(animation: Animation) {
  return typeof animation.currentTime === 'number' ? animation.currentTime : 0;
}

function isHomepageAmbientAnimation(animation: Animation): animation is CSSAnimation {
  return (
    animation instanceof CSSAnimation &&
    animation.timeline === document.timeline &&
    animation.effect?.getTiming().iterations === Number.POSITIVE_INFINITY &&
    HOME_AMBIENT_ANIMATION_NAMES.has(animation.animationName)
  );
}

export function AmbientMotionController({ children }: AmbientMotionControllerProps) {
  const { effectiveLevel } = useMotionPreferences();

  useEffect(() => {
    if (effectiveLevel !== 'high') return;

    const controlledAnimations = new Map<CSSAnimation, AmbientAnimationState>();
    let frameId = 0;
    let timerId = 0;

    // Newly materialized content-visibility sections can create animations after
    // hydration, so each animationstart event is folded into the shared clock.
    // content-visibility 区段可能在 hydration 后才实例化动画，因此通过
    // animationstart 将新动画并入共享时钟。
    const syncAnimations = () => {
      const capturedAt = performance.now();
      for (const animation of document.getAnimations()) {
        if (
          !isHomepageAmbientAnimation(animation) ||
          controlledAnimations.has(animation) ||
          animation.playState === 'idle'
        ) {
          continue;
        }

        controlledAnimations.set(animation, {
          animation,
          capturedAt,
          currentTime: readCurrentTime(animation),
        });
        animation.pause();
      }
    };

    // Each clock pulse advances every ambient animation to its exact native
    // timeline position, briefly lets the compositor present one frame, then
    // pauses until the next shared pulse. Durations, phases, easing, and filters
    // stay unchanged while high-refresh displays avoid redundant submissions.
    // 每次时钟脉冲都把全部环境动画推进到原生时间线的准确位置，允许合成器
    // 呈现一帧后再次暂停。时长、相位、缓动和滤镜均保持不变，同时避免高刷屏
    // 重复提交无感知收益的帧。
    const sampleAnimations = () => {
      const sampledAt = performance.now();
      for (const [animation, state] of controlledAnimations) {
        if (animation.playState === 'idle' || !animation.effect) {
          controlledAnimations.delete(animation);
          continue;
        }

        animation.currentTime = state.currentTime + sampledAt - state.capturedAt;
        animation.play();
      }

      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        for (const animation of controlledAnimations.keys()) animation.pause();
      });
    };

    const stopClock = () => {
      if (timerId) {
        window.clearInterval(timerId);
        timerId = 0;
      }
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      for (const animation of controlledAnimations.keys()) animation.pause();
    };

    const startClock = () => {
      if (timerId || document.hidden) return;
      syncAnimations();
      const capturedAt = performance.now();
      for (const state of controlledAnimations.values()) {
        state.currentTime = readCurrentTime(state.animation);
        state.capturedAt = capturedAt;
      }
      timerId = window.setInterval(sampleAnimations, HOME_AMBIENT_FRAME_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopClock();
      } else {
        startClock();
      }
    };
    const handleAnimationStart = (event: AnimationEvent) => {
      if (HOME_AMBIENT_ANIMATION_NAMES.has(event.animationName)) syncAnimations();
    };

    syncAnimations();
    startClock();
    document.addEventListener('animationstart', handleAnimationStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', stopClock);
    window.addEventListener('pageshow', startClock);

    return () => {
      document.removeEventListener('animationstart', handleAnimationStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', stopClock);
      window.removeEventListener('pageshow', startClock);
      stopClock();
      // Restore native playback before route teardown so transition snapshots
      // never inherit controller-owned paused animation state.
      // 路由卸载前恢复原生播放，避免转场快照继承控制器持有的暂停状态。
      for (const animation of controlledAnimations.keys()) {
        if (animation.playState !== 'idle') animation.play();
      }
      controlledAnimations.clear();
    };
  }, [effectiveLevel]);

  return children;
}
