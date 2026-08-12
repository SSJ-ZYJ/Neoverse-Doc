const TASK_LIST_SCROLL_BASE_DURATION_MS = 400;
const TASK_LIST_SCROLL_DISTANCE_PER_MS = 10;
const TASK_LIST_SCROLL_MAX_DURATION_MS = 2_400;

// Scale long jumps by distance while keeping the wait bounded. The zero-distance
// case stays immediate so an already-visible task list never animates in place.
// 长距离跳转按位移延长，同时限制最长等待；目标已在当前位置时保持即时完成。
export function getTaskListScrollDuration(distance: number): number {
  const absoluteDistance = Math.abs(distance);
  if (absoluteDistance <= 1) return 0;

  return Math.min(
    TASK_LIST_SCROLL_MAX_DURATION_MS,
    TASK_LIST_SCROLL_BASE_DURATION_MS + absoluteDistance / TASK_LIST_SCROLL_DISTANCE_PER_MS,
  );
}

// A continuous sine curve has zero velocity at both ends and no phase boundary
// between acceleration and deceleration.
// 连续正弦曲线在起止点速度均为零，加速与减速之间没有阶段折点。
export function getTaskListScrollProgress(progress: number): number {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  return (1 - Math.cos(Math.PI * clampedProgress)) / 2;
}
