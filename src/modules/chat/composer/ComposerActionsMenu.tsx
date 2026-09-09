import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { PaperclipIcon } from '@phosphor-icons/react/dist/csr/Paperclip';
import { TerminalIcon } from '@phosphor-icons/react/dist/csr/Terminal';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { MicrophoneIcon } from '@phosphor-icons/react/dist/csr/Microphone';
import { EraserIcon } from '@phosphor-icons/react/dist/csr/Eraser';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';

import { useComposerMenuAnchor } from '@/modules/chat/hooks/useComposerMenuAnchor';
import { ComposerMenuItem, ComposerMenuSeparator, ComposerMenuSurface } from '@/modules/chat/composer/ComposerMenuPrimitives';
import { ScheduleMessageOptions } from '@/modules/chat/composer/ScheduleMessageOptions';
import TokenUsageSummary from '@/modules/chat/composer/TokenUsageSummary';

type ComposerActionsMenuProps = {
  hasDraft: boolean;
  canSchedule: boolean;
  commandCount: number;
  tokenBudget: Record<string, unknown> | null;
  onAttach: () => void;
  onCommands: () => void;
  onSchedule: (scheduledFor: Date) => void;
  onTokenUsage: () => void;
  onClear: () => void;
  onVoiceInput?: () => void;
};

/** Used by ChatComposer to keep secondary actions behind a single add button. */
export default function ComposerActionsMenu({
  hasDraft, canSchedule, commandCount, tokenBudget,
  onAttach, onCommands, onSchedule, onTokenUsage, onClear, onVoiceInput,
}: ComposerActionsMenuProps) {
  const { t } = useTranslation('chat');
  // A single popup swaps its actions for scheduling, avoiding nested portals.
  const [view, setView] = useState<'actions' | 'schedule' | null>(null);
  const close = useCallback(() => setView(null), []);
  const { triggerRef, menuRef, anchor, updateAnchor } = useComposerMenuAnchor(view !== null, close, 272, 'left');
  const label = t('composer.actions', { defaultValue: 'Add files and tools' });

  useEffect(() => {
    if (view) menuRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
  }, [view, menuRef]);

  const run = (action: () => void) => {
    close();
    triggerRef.current?.focus();
    action();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="codex-composer-add"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={view !== null}
        title={label}
        onClick={() => {
          updateAnchor();
          setView((current) => current ? null : 'actions');
        }}
      >
        <PlusIcon size={22} />
      </button>
      {view && anchor && createPortal(
        <ComposerMenuSurface anchor={anchor} menuRef={menuRef} ariaLabel={label}>
          {view === 'schedule' ? (
            <>
              <ComposerMenuItem role="menuitem" icon={<ArrowLeftIcon />} label={t('composer.back', { defaultValue: 'Back' })} isSelected={false} onSelect={() => setView('actions')} />
              <ComposerMenuSeparator />
              <ScheduleMessageOptions onSchedule={(date) => run(() => onSchedule(date))} />
            </>
          ) : (
            <>
              <ComposerMenuItem role="menuitem" icon={<PaperclipIcon />} label={t('input.attachFiles')} isSelected={false} onSelect={() => run(onAttach)} />
              <ComposerMenuItem role="menuitem" icon={<TerminalIcon />} label={t('input.showAllCommands')} trailing={<span className="text-[11px] text-muted-foreground">{commandCount || '/'}</span>} isSelected={false} onSelect={() => run(onCommands)} />
              {onVoiceInput && <ComposerMenuItem role="menuitem" icon={<MicrophoneIcon />} label={t('voice.input')} isSelected={false} onSelect={() => run(onVoiceInput)} />}
              <ComposerMenuItem role="menuitem" icon={<ClockIcon />} label={t('schedule.trigger')} disabled={!canSchedule} isSelected={false} onSelect={() => setView('schedule')} />
              <ComposerMenuSeparator />
              <TokenUsageSummary usage={tokenBudget} onClick={() => run(onTokenUsage)} />
              {hasDraft && <ComposerMenuItem role="menuitem" icon={<EraserIcon />} label={t('input.clearInput')} isSelected={false} onSelect={() => run(onClear)} />}
            </>
          )}
        </ComposerMenuSurface>, document.body,
      )}
    </>
  );
}
