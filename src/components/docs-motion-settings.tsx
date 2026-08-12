'use client';

import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { ThemeSwitch, type ThemeSwitchProps } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import { Settings } from 'lucide-react';
import { useId } from 'react';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';
import { MOTION_LEVELS, type MotionLevel } from '@/runtime/motion/preferences';
import { useMotionPreferences } from '@/runtime/motion/provider';

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
  const {
    experimentalMotionSupported,
    preferences,
    setExperimental,
    setLevel,
    systemReducedMotion,
  } = useMotionPreferences();
  const descriptionId = useId();
  const experimentalDescriptionId = useId();
  const experimentalNoteId = useId();
  const motionLevelName = useId();
  const experimentalUnavailable =
    preferences.level === 'low' || systemReducedMotion || experimentalMotionSupported === false;
  const experimentalNotices = [
    preferences.level === 'low' ? dict.experimentalMotionUnavailableLow : null,
    experimentalMotionSupported === false ? dict.experimentalMotionUnavailableUnsupported : null,
    systemReducedMotion ? dict.systemReducedMotionNotice : null,
  ].filter((notice): notice is string => notice !== null);
  const experimentalDescribedBy = [
    experimentalDescriptionId,
    experimentalNotices.length > 0 ? experimentalNoteId : null,
  ]
    .filter(Boolean)
    .join(' ');
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
          <div className="docs-motion-levels" data-level={preferences.level}>
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
            aria-describedby={experimentalDescribedBy}
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

        {experimentalNotices.length > 0 ? (
          <p className="docs-motion-settings-note" id={experimentalNoteId} role="status">
            {experimentalNotices.join(' ')}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
