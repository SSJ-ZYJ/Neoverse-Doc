import type { NavigationPhase } from '@/runtime/navigation/store';

export type DeferredTocPhase = 'visible' | 'retained';

export interface DeferredTocState<T> {
  path: string;
  phase: DeferredTocPhase;
  toc: T;
}

export function advanceDeferredTocState<T>(
  current: DeferredTocState<T>,
  navigationPhase: NavigationPhase,
  pathname: string,
  toc: T,
): DeferredTocState<T> {
  if (navigationPhase === 'capturing' || navigationPhase === 'leaving') {
    return current.phase === 'retained' ? current : { ...current, phase: 'retained' };
  }

  if (current.path !== pathname) return { path: pathname, phase: 'visible', toc };
  return current.phase === 'visible' ? current : { ...current, phase: 'visible' };
}
