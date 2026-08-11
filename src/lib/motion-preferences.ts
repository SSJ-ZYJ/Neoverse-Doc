// Site-wide motion preferences combine the reader's saved choice with the
// operating system reduced-motion preference before exposing effective state.
// 全站动效偏好先合并读者保存的选择与操作系统减少动态效果偏好，
// 再向各类动效暴露统一的实际生效状态。

export const MOTION_PREFERENCES_STORAGE_KEY = 'nd-motion-preferences';
export const MOTION_PREFERENCES_CHANGE_EVENT = 'nd-motion-preferences-change';

export const MOTION_LEVELS = ['low', 'medium', 'high'] as const;

export type MotionLevel = (typeof MOTION_LEVELS)[number];

export interface MotionPreferences {
  experimental: boolean;
  level: MotionLevel;
}

export const DEFAULT_MOTION_PREFERENCES: Readonly<MotionPreferences> = {
  experimental: true,
  level: 'high',
};

function isMotionLevel(value: unknown): value is MotionLevel {
  return typeof value === 'string' && MOTION_LEVELS.includes(value as MotionLevel);
}

export function normalizeMotionPreferences(value: unknown): MotionPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_MOTION_PREFERENCES };

  const candidate = value as Partial<MotionPreferences>;
  const level = isMotionLevel(candidate.level) ? candidate.level : DEFAULT_MOTION_PREFERENCES.level;
  const experimental =
    level === 'low'
      ? false
      : typeof candidate.experimental === 'boolean'
        ? candidate.experimental
        : DEFAULT_MOTION_PREFERENCES.experimental;

  return { experimental, level };
}

export function parseMotionPreferences(value: string | null): MotionPreferences {
  if (!value) return { ...DEFAULT_MOTION_PREFERENCES };
  try {
    return normalizeMotionPreferences(JSON.parse(value));
  } catch {
    return { ...DEFAULT_MOTION_PREFERENCES };
  }
}

export function readMotionPreferences(): MotionPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_MOTION_PREFERENCES };
  try {
    return parseMotionPreferences(window.localStorage.getItem(MOTION_PREFERENCES_STORAGE_KEY));
  } catch {
    return { ...DEFAULT_MOTION_PREFERENCES };
  }
}

export function writeMotionPreferences(preferences: MotionPreferences): void {
  try {
    window.localStorage.setItem(MOTION_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable in privacy-restricted contexts; the in-memory
    // preference remains active for the current page.
    // 隐私限制环境可能禁用存储；此时内存中的偏好仍在当前页面生效。
  }
}

export function resolveEffectiveMotionLevel(
  preferences: MotionPreferences,
  systemReducedMotion: boolean,
): MotionLevel {
  return systemReducedMotion ? 'low' : preferences.level;
}

export function resolveEffectiveExperimentalMotion(
  preferences: MotionPreferences,
  systemReducedMotion: boolean,
): boolean {
  return !systemReducedMotion && preferences.level !== 'low' && preferences.experimental;
}

export function applyMotionPreferences(
  preferences: MotionPreferences,
  systemReducedMotion: boolean,
): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.ndMotionLevel = resolveEffectiveMotionLevel(preferences, systemReducedMotion);
  root.dataset.ndExperimentalMotion = resolveEffectiveExperimentalMotion(
    preferences,
    systemReducedMotion,
  )
    ? 'on'
    : 'off';
  root.dataset.ndSystemReducedMotion = systemReducedMotion ? 'true' : 'false';
  document.dispatchEvent(new Event(MOTION_PREFERENCES_CHANGE_EVENT));
}

export function getEffectiveMotionLevel(): MotionLevel {
  if (typeof document === 'undefined') return DEFAULT_MOTION_PREFERENCES.level;
  const level = document.documentElement.dataset.ndMotionLevel;
  return isMotionLevel(level) ? level : DEFAULT_MOTION_PREFERENCES.level;
}

export function isExperimentalMotionEnabled(): boolean {
  if (typeof document === 'undefined') return DEFAULT_MOTION_PREFERENCES.experimental;
  return (
    document.documentElement.dataset.ndExperimentalMotion === 'on' &&
    getEffectiveMotionLevel() !== 'low'
  );
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    getEffectiveMotionLevel() === 'low' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Run before hydration so persisted low-motion preferences never flash the
// default high-motion experience during the first rendered frame.
// 在 hydration 前恢复偏好，避免已保存的低动效设置首帧闪现默认高动效。
export const MOTION_PREFERENCES_BOOTSTRAP = `(()=>{const k=${JSON.stringify(
  MOTION_PREFERENCES_STORAGE_KEY,
)};let l='high',e=true;try{const v=JSON.parse(localStorage.getItem(k)||'null');if(v&&['low','medium','high'].includes(v.level))l=v.level;if(v&&typeof v.experimental==='boolean')e=v.experimental}catch{}if(l==='low')e=false;const s=matchMedia('(prefers-reduced-motion: reduce)').matches,r=document.documentElement;r.dataset.ndMotionLevel=s?'low':l;r.dataset.ndExperimentalMotion=!s&&l!=='low'&&e?'on':'off';r.dataset.ndSystemReducedMotion=s?'true':'false'})()`;
