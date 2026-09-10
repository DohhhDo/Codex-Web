import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { ArrowElbowDownLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowElbowDownLeft';
import { SparkleIcon } from '@phosphor-icons/react/dist/csr/Sparkle';
import { TerminalIcon } from '@phosphor-icons/react/dist/csr/Terminal';

import { useComposerMenuAnchor } from '@/modules/chat/hooks/useComposerMenuAnchor';
import type { SlashCommand } from '@/shared/types';
import { cn } from '@/shared/utils';

type CommandMenuProps = {
  id: string;
  anchorRef: RefObject<HTMLTextAreaElement>;
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (command: SlashCommand, index: number, isHover: boolean) => void;
  onClose: () => void;
  isOpen: boolean;
};

/** Used by ChatComposer for command completion; row order matches keyboard navigation. */
export default function CommandMenu({ id, anchorRef, commands, selectedIndex, onSelect, onClose, isOpen }: CommandMenuProps) {
  const { t } = useTranslation('chat');
  const { menuRef, anchor } = useComposerMenuAnchor(isOpen, onClose, 400, 'left', anchorRef);
  const selectedItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const item = selectedItemRef.current;
    const menu = menuRef.current;
    if (!item || !menu) return;
    const itemRect = item.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    if (itemRect.bottom > menuRect.bottom || itemRect.top < menuRect.top) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, commands, anchor, menuRef]);

  if (!isOpen || !anchor) return null;

  return createPortal(
    <div
      id={id}
      ref={menuRef}
      role="listbox"
      aria-label={t('composer.commands.label', { defaultValue: 'Commands and skills' })}
      className="codex-composer-menu command-menu fixed z-[100] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 text-popover-foreground"
      style={{ right: anchor.right, top: anchor.top, bottom: anchor.bottom, width: anchor.maxWidth, maxWidth: anchor.maxWidth, maxHeight: Math.min(336, anchor.maxHeight) }}
    >
      {commands.length === 0 ? (
        <div role="status" className="px-3 py-4 text-sm text-muted-foreground">
          {t('composer.commands.empty', { defaultValue: 'No matching commands or skills' })}
        </div>
      ) : commands.map((command, index) => {
        const isSelected = selectedIndex === index;
        const isSkill = command.type === 'skill' || command.namespace === 'skill';
        const Icon = isSkill ? SparkleIcon : TerminalIcon;
        return (
          <div
            id={`${id}-${index}`}
            key={`${command.name}:${command.path ?? ''}:${index}`}
            ref={isSelected ? selectedItemRef : undefined}
            role="option"
            aria-selected={isSelected}
            className={cn('command-item flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm', isSelected ? 'bg-accent text-foreground' : 'hover:bg-accent')}
            onMouseMove={() => { if (!isSelected) onSelect(command, index, true); }}
            onClick={() => onSelect(command, index, false)}
            onMouseDown={(event) => event.preventDefault()}
          >
            <Icon size={16} className="shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <span className="block truncate leading-5" title={command.name}>{command.name}</span>
              {command.description && (
                <span className="block truncate text-xs leading-5 text-muted-foreground" title={command.description}>{command.description}</span>
              )}
            </div>
            <ArrowElbowDownLeftIcon size={14} aria-hidden className={cn('shrink-0 text-muted-foreground', !isSelected && 'invisible')} />
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
