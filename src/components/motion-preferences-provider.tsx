'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supportsExperimentalMotion } from '@/lib/experimental-motion-support';
import {
  applyMotionPreferences,
  DEFAULT_MOTION_PREFERENCES,
  MOTION_PREFERENCES_STORAGE_KEY,
  type MotionLevel,
  type MotionPreferences,
  parseMotionPreferences,
  readMotionPreferences,
  resolveEffectiveExperimentalMotion,
  resolveEffectiveMotionLevel,
  writeMotionPreferences,
} from '@/lib/motion-preferences';

interface MotionPreferencesContextValue {
  effectiveExperimental: boolean;
  effectiveLevel: MotionLevel;
  experimentalMotionSupported: boolean | null;
  preferences: MotionPreferences;
  setExperimental: (enabled: boolean) => void;
  setLevel: (level: MotionLevel) => void;
  systemReducedMotion: boolean;
}

const MotionPreferencesContext = createContext<MotionPreferencesContextValue | null>(null);

export function MotionPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<MotionPreferences>({
    ...DEFAULT_MOTION_PREFERENCES,
  });
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [experimentalMotionSupported, setExperimentalMotionSupported] = useState<boolean | null>(
    null,
  );
  const preferencesRef = useRef(preferences);
  const systemReducedMotionRef = useRef(systemReducedMotion);
  const experimentalMotionSupportedRef = useRef(false);

  const commitPreferences = useCallback((next: MotionPreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
    writeMotionPreferences(next);
    applyMotionPreferences(
      next,
      systemReducedMotionRef.current,
      experimentalMotionSupportedRef.current,
    );
  }, []);

  const setLevel = useCallback(
    (level: MotionLevel) => {
      const current = preferencesRef.current;
      const enableExperimentalWithHigh =
        current.level !== 'high' &&
        level === 'high' &&
        experimentalMotionSupportedRef.current;
      commitPreferences({
        experimental: level === 'low' ? false : enableExperimentalWithHigh || current.experimental,
        level,
      });
    },
    [commitPreferences],
  );

  const setExperimental = useCallback(
    (enabled: boolean) => {
      const current = preferencesRef.current;
      commitPreferences({
        ...current,
        experimental: current.level === 'low' ? false : enabled,
      });
    },
    [commitPreferences],
  );

  useLayoutEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stored = readMotionPreferences();
    const supported = supportsExperimentalMotion();
    preferencesRef.current = stored;
    systemReducedMotionRef.current = motionQuery.matches;
    experimentalMotionSupportedRef.current = supported;
    setPreferences(stored);
    setSystemReducedMotion(motionQuery.matches);
    setExperimentalMotionSupported(supported);
    applyMotionPreferences(stored, motionQuery.matches, supported);

    const handleSystemPreferenceChange = (event: MediaQueryListEvent) => {
      systemReducedMotionRef.current = event.matches;
      setSystemReducedMotion(event.matches);
      applyMotionPreferences(
        preferencesRef.current,
        event.matches,
        experimentalMotionSupportedRef.current,
      );
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== MOTION_PREFERENCES_STORAGE_KEY && event.key !== null) return;
      const next = parseMotionPreferences(event.newValue);
      preferencesRef.current = next;
      setPreferences(next);
      applyMotionPreferences(
        next,
        systemReducedMotionRef.current,
        experimentalMotionSupportedRef.current,
      );
    };

    motionQuery.addEventListener('change', handleSystemPreferenceChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      motionQuery.removeEventListener('change', handleSystemPreferenceChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const value = useMemo<MotionPreferencesContextValue>(
    () => ({
      effectiveExperimental: resolveEffectiveExperimentalMotion(
        preferences,
        systemReducedMotion,
        experimentalMotionSupported === true,
      ),
      effectiveLevel: resolveEffectiveMotionLevel(preferences, systemReducedMotion),
      experimentalMotionSupported,
      preferences,
      setExperimental,
      setLevel,
      systemReducedMotion,
    }),
    [experimentalMotionSupported, preferences, setExperimental, setLevel, systemReducedMotion],
  );

  return (
    <MotionPreferencesContext.Provider value={value}>{children}</MotionPreferencesContext.Provider>
  );
}

export function useMotionPreferences(): MotionPreferencesContextValue {
  const value = useContext(MotionPreferencesContext);
  if (!value)
    throw new Error('useMotionPreferences must be used within MotionPreferencesProvider.');
  return value;
}
