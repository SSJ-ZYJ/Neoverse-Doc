'use client';

import { useSyncExternalStore } from 'react';
import {
  getNavigationSnapshot,
  getServerNavigationSnapshot,
  type NavigationSnapshot,
  subscribeNavigation,
} from './store';

export function useNavigationSnapshot(): NavigationSnapshot {
  return useSyncExternalStore(
    subscribeNavigation,
    getNavigationSnapshot,
    getServerNavigationSnapshot,
  );
}
