export type NavigationPhase = 'idle' | 'capturing' | 'leaving' | 'entering';

export interface NavigationIntent {
  kind: string;
  sourcePath: string;
  targetPath: string;
}

export interface NavigationSnapshot {
  phase: NavigationPhase;
  intent?: NavigationIntent;
}

type NavigationListener = () => void;

const IDLE_SNAPSHOT: NavigationSnapshot = { phase: 'idle' };
const listeners = new Set<NavigationListener>();
let snapshot = IDLE_SNAPSHOT;

export function getNavigationSnapshot(): NavigationSnapshot {
  return snapshot;
}

export function getServerNavigationSnapshot(): NavigationSnapshot {
  return IDLE_SNAPSHOT;
}

export function subscribeNavigation(listener: NavigationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setNavigationPhase(
  phase: Exclude<NavigationPhase, 'idle'>,
  intent: NavigationIntent,
): void {
  snapshot = { phase, intent };
  for (const listener of listeners) listener();
}

export function finishNavigation(): void {
  if (snapshot === IDLE_SNAPSHOT) return;
  snapshot = IDLE_SNAPSHOT;
  for (const listener of listeners) listener();
}
