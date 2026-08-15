// Pointer session state: tracks active pointer sessions, batches pointer
// moves onto animation frames, and plans interpolated drag emissions.
// 指针会话状态：跟踪活跃指针会话，将移动事件批处理到动画帧，
// 并规划插值拖拽发射。

import { prefersReducedMotion } from '@/runtime/motion/config';
import { pointIsInside, toLocalPoint } from './geometry';
import type { ParticleEmission, ParticleSession } from './types';

const MAX_INTERPOLATED_STEPS = 14;

interface PendingMove {
  clientX: number;
  clientY: number;
  pointerId: number;
}

export interface PointerSessionStore {
  clear(): void;
  end(pointerId: number): ParticleSession | undefined;
  forEach(callback: (session: ParticleSession) => void): void;
  has(pointerId: number): boolean;
  pauseFrames(): void;
  queueMove(event: PointerEvent): void;
  start(pointerId: number, session: ParticleSession): void;
}

export function createPointerSessionStore(
  onEmit: (session: ParticleSession, emissions: ParticleEmission[]) => void,
): PointerSessionStore {
  const sessions = new Map<number, ParticleSession>();
  const pendingMoves = new Map<number, PendingMove>();
  let frameId = 0;

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
        distance < session.policy.emitDistance
      ) {
        continue;
      }

      const steps = Math.min(
        MAX_INTERPOLATED_STEPS,
        Math.max(1, Math.floor(distance / session.policy.emitDistance)),
      );
      if (!prefersReducedMotion()) {
        const direction = Math.atan2(dy, dx);
        const emissions: ParticleEmission[] = [];
        for (let step = 1; step <= steps; step += 1) {
          const ratio = step / steps;
          const point = toLocalPoint(
            session.rect,
            session.lastX + dx * ratio,
            session.lastY + dy * ratio,
          );
          emissions.push({
            count: session.policy.dragCount,
            direction,
            originX: point.x,
            originY: point.y,
          });
        }
        onEmit(session, emissions);
      }
      session.lastX = move.clientX;
      session.lastY = move.clientY;
    }
    pendingMoves.clear();
  };

  return {
    clear() {
      sessions.clear();
    },
    end(pointerId) {
      const session = sessions.get(pointerId);
      sessions.delete(pointerId);
      pendingMoves.delete(pointerId);
      return session;
    },
    forEach(callback) {
      for (const [, session] of sessions) callback(session);
    },
    has(pointerId) {
      return sessions.has(pointerId);
    },
    // Drop scheduled frames and pending moves (tab hidden, pagehide, unmount).
    // Sessions stay intact so an in-flight drag resumes cleanly on focus.
    // 丢弃已调度帧与待处理移动（标签页隐藏、pagehide、卸载）。
    // 会话保留，以便拖拽中断后焦点恢复时继续。
    pauseFrames() {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      pendingMoves.clear();
    },
    queueMove(event) {
      pendingMoves.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
        pointerId: event.pointerId,
      });
      if (!frameId) frameId = window.requestAnimationFrame(processMoves);
    },
    start(pointerId, session) {
      sessions.set(pointerId, session);
    },
  };
}
