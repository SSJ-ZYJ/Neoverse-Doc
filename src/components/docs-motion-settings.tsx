'use client';

import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { ThemeSwitch, type ThemeSwitchProps } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import { Settings } from 'lucide-react';
import { useId } from 'react';
import { useMotionPreferences } from '@/components/motion-preferences-provider';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';
import { MOTION_LEVELS, type MotionLevel } from '@/lib/motion-preferences';

export function DocsThemeAndMotionSettings(props: ThemeSwitchProps) {
  return (
    <>
      <ThemeSwitch {...props} />
      <DocsMotionSettings />
    </>
  );
}

function DocsMotionSettings() {
  const { locale } = useI18n();
  const dict = getPageDictionary(resolveLocale(locale));
  const { preferences, setExperimental, setLevel, systemReducedMotion } = useMotionPreferences();
  const descriptionId = useId();
  const experimentalDescriptionId = useId();
  const motionLevelName = useId();
  const experimentalUnavailable = preferences.level === 'low' || systemReducedMotion;
  const levelLabels: Record<MotionLevel, string> = {
    high: dict.motionLevelHigh,
    low: dict.motionLevelLow,
    medium: dict.motionLevelMedium,
  };

  return (
    <Popover>
      <PopoverTrigger
        aria-label={dict.motionSettingsLabel}
        className="docs-motion-settings-trigger"
        data-motion-settings-trigger=""
        title={dict.motionSettingsLabel}
      >
        <Settings aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-describedby={descriptionId}
        aria-label={dict.motionSettingsLabel}
        className="docs-motion-settings-popover"
        sideOffset={8}
      >
        <div className="docs-motion-settings-heading">
          <strong>{dict.motionSettingsLabel}</strong>
          <p id={descriptionId}>{dict.motionSettingsDescription}</p>
        </div>

        <fieldset className="docs-motion-settings-fieldset">
          <legend>{dict.motionLevelLabel}</legend>
          <div className="docs-motion-levels">
            {MOTION_LEVELS.map((level) => (
              <label data-active={preferences.level === level ? '' : undefined} key={level}>
                <input
                  checked={preferences.level === level}
                  name={motionLevelName}
                  onChange={() => setLevel(level)}
                  type="radio"
                  value={level}
                />
                <span>{levelLabels[level]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="docs-motion-experimental">
          <div>
            <strong>{dict.experimentalMotionLabel}</strong>
            <p id={experimentalDescriptionId}>{dict.experimentalMotionDescription}</p>
          </div>
          <button
            aria-checked={preferences.experimental}
            aria-describedby={experimentalDescriptionId}
            aria-label={dict.experimentalMotionLabel}
            className="docs-motion-switch"
            data-checked={preferences.experimental ? '' : undefined}
            disabled={experimentalUnavailable}
            onClick={() => setExperimental(!preferences.experimental)}
            role="switch"
            type="button"
          >
            <span aria-hidden="true" className="docs-motion-switch-thumb" />
          </button>
        </div>

        {preferences.level === 'low' ? (
          <p className="docs-motion-settings-note">{dict.experimentalMotionUnavailableLow}</p>
        ) : null}
        {systemReducedMotion ? (
          <p className="docs-motion-settings-note" role="status">
            {dict.systemReducedMotionNotice}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
