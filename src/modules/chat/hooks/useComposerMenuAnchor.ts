import { useCallback, useEffect, useRef, useState } from 'react';

import type { ComposerMenuAnchor } from '@/shared/types';


const VIEWPORT_MARGIN = 8;
const MENU_GAP = 8;

/**
 * Used by chat's model, permission and action menus to place a portal below
 * a central composer or above a bottom composer, clamped to the viewport.
 */
export function useComposerMenuAnchor(
  isOpen: boolean,
  onClose: () => void,
  preferredWidth = 320,
  align: 'left' | 'right' = 'right',
) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  // Store measured placement so portalled menus track their trigger and viewport.
  const [anchor, setAnchor] = useState<ComposerMenuAnchor | null>(null);

  const updateAnchor = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const width = Math.min(preferredWidth, window.innerWidth - VIEWPORT_MARGIN * 2);
    const preferredRight = align === 'left'
      ? window.innerWidth - rect.left - width
      : window.innerWidth - rect.right;
    const right = Math.max(VIEWPORT_MARGIN, Math.min(preferredRight, window.innerWidth - width - VIEWPORT_MARGIN));
    const below = Math.max(0, window.innerHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN);
    const above = Math.max(0, rect.top - MENU_GAP - VIEWPORT_MARGIN);
    // Prefer the reference's downward menu when it has usable room. In short
    // windows use the larger side, with scrolling rather than offscreen rows.
    const opensBelow = below >= 280 || below >= above;
    setAnchor({
      right,
      ...(opensBelow ? { top: rect.bottom + MENU_GAP } : { bottom: window.innerHeight - rect.top + MENU_GAP }),
      maxHeight: opensBelow ? below : above,
      maxWidth: width,
    });
  }, [preferredWidth, align]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onClose();
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', updateAnchor);
    window.addEventListener('scroll', updateAnchor, true);
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    updateAnchor();

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('scroll', updateAnchor, true);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, onClose, updateAnchor]);

  return { triggerRef, menuRef, anchor, updateAnchor };
}
