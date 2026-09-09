import type { ReactNode, Ref } from 'react';
import { CheckIcon as Check } from '@phosphor-icons/react/dist/csr/Check';

import { cn } from '@/shared/utils';
import type { ComposerMenuAnchor } from '@/shared/types';

/**
 * Shared shell for the composer popovers (model/effort and permissions) so both
 * menus share one surface, one heading style and one row style.
 *
 * Used by chat's model, permission, action and scheduling menus.
 */
export function ComposerMenuSurface({
  anchor,
  menuRef,
  ariaLabel,
  children,
}: {
  anchor: ComposerMenuAnchor;
  menuRef: Ref<HTMLDivElement>;
  ariaLabel: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={menuRef}
      role="menu"
      onKeyDown={(event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        // Preserve native arrow keys in the scheduling date/time input.
        if (event.target instanceof HTMLInputElement) return;
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        if (!items.length) return;
        event.preventDefault();
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }}
      aria-label={ariaLabel}
      className="codex-composer-menu fixed z-[100] min-w-48 overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 text-popover-foreground"
      style={{
        right: anchor.right,
        bottom: anchor.bottom,
        top: anchor.top,
        maxHeight: anchor.maxHeight,
        width: anchor.maxWidth,
        maxWidth: anchor.maxWidth,
      }}
    >
      {children}
    </div>
  );
}

/** Used by chat's ComposerModelMenu and ComposerPermissionMenu to label a section of the popover. */
export function ComposerMenuHeading({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground">{children}</p>
  );
}

/** Used by chat's ComposerModelMenu to divide its model and effort sections. */
export function ComposerMenuSeparator() {
  return <div className="my-1 h-px bg-border" aria-hidden />;
}

/** Used by chat's ComposerModelMenu and ComposerPermissionMenu to render one selectable row with its checked state. */
export function ComposerMenuItem({
  label,
  description,
  icon,
  isSelected,
  onSelect,
  role = 'menuitemradio',
  trailing,
  className,
  disabled = false,
  expanded,
}: {
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  role?: 'menuitemradio' | 'menuitem';
  trailing?: ReactNode;
  className?: string;
  disabled?: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-expanded={expanded}
      aria-checked={role === 'menuitemradio' ? isSelected : undefined}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'flex min-h-9 w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
        'hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-40 disabled:pointer-events-none',
        isSelected ? 'text-foreground' : 'text-foreground/90',
        className,
      )}
    >
      {icon && <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate leading-5">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{description}</span>
        )}
      </span>
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        {trailing ?? (isSelected ? <Check className="h-3.5 w-3.5 text-foreground" /> : null)}
      </span>
    </button>
  );
}
