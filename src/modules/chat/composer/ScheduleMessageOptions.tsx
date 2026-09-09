import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ComposerMenuHeading,
  ComposerMenuItem,
  ComposerMenuSeparator,
} from '@/modules/chat/composer/ComposerMenuPrimitives';

/** Offsets people actually mean when they say "later". */
const QUICK_OFFSETS_MINUTES = [15, 60, 8 * 60, 24 * 60];

/**
 * Turns the picker's `datetime-local` value into an absolute instant.
 *
 * That input carries no zone, and `new Date(value)` reads it in the browser's
 * — which is what the user meant, since they picked it off their own clock.
 * Converting here means the server stores one unambiguous instant, so the
 * schedule does not move if they are on another device when it fires.
 */
function readLocalDateTime(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toLocalInputValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Used by ComposerActionsMenu's scheduling view to send the current draft later. */
export function ScheduleMessageOptions({ onSchedule }: { onSchedule: (scheduledFor: Date) => void }) {
  const { t } = useTranslation('chat');
  const inputId = useId();
  // Keep displayed time suggestions stable for the lifetime of this picker.
  const [openedAt] = useState(Date.now);
  // Keep the user's custom send time while they browse the scheduling choices.
  const [customValue, setCustomValue] = useState(() => toLocalInputValue(new Date(openedAt + 3_600_000)));
  const customDate = readLocalDateTime(customValue);
  const customDateIsValid = Boolean(customDate && customDate.getTime() > openedAt);
  const commit = (scheduledFor: Date) => {
    if (scheduledFor.getTime() > Date.now()) onSchedule(scheduledFor);
  };
  return (
    <>
      <ComposerMenuHeading>{t('schedule.heading')}</ComposerMenuHeading>
      {QUICK_OFFSETS_MINUTES.map((minutes) => (
        <ComposerMenuItem
          role="menuitem"
          key={minutes}
          label={t(`schedule.in.${minutes}`)}
          description={new Date(openedAt + minutes * 60_000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          isSelected={false}
          onSelect={() => commit(new Date(Date.now() + minutes * 60_000))}
        />
      ))}

      <ComposerMenuSeparator />
      <div className="px-2.5 pb-1.5">
        <label className="block text-[11px] font-medium text-muted-foreground" htmlFor={inputId}>
          {t('schedule.customLabel')}
        </label>
        <input
          id={inputId}
          type="datetime-local"
          min={toLocalInputValue(new Date(openedAt))}
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground"
        />
        <button
          type="button"
          onClick={() => {
            const parsed = readLocalDateTime(customValue);
            if (parsed) commit(parsed);
          }}
          disabled={!customDateIsValid}
          className="mt-2 w-full rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {t('schedule.confirm')}
        </button>
      </div>
    </>
  );
}
