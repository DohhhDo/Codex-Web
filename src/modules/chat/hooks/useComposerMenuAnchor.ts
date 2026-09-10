import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { ComposerMenuAnchor } from '@/shared/types';


const VIEWPORT_MARGIN = 8;
const MENU_GAP = 8;

/**
 * Used by chat's model, permission, action and command menus to place a portal below
 * a central composer or above a bottom composer, clamped to the viewport.
 */
export function useComposerMenuAnchor(
  isOpen: boolean,
  onClose: () => void,
  preferredWidth = 320,
  align: 'left' | 'right' = 'right',
  inputRef?: RefObject<HTMLTextAreaElement>,
) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  // Store measured placement so portalled menus track their trigger and viewport.
  const [anchor, setAnchor] = useState<ComposerMenuAnchor | null>(null);

  const updateAnchor = useCallback(() => {
    // Completion menus anchor to the whole composer, keeping the draft visible.
    const element = inputRef?.current?.closest('form') ?? inputRef?.current ?? triggerRef.current;
    const rect = element?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const viewport = window.visualViewport;
    const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const viewportTop = viewport?.offsetTop ?? 0;
    const width = Math.min(preferredWidth, window.innerWidth - VIEWPORT_MARGIN * 2);
    const preferredRight = align === 'left'
      ? window.innerWidth - rect.left - width
      : window.innerWidth - rect.right;
    const right = Math.max(VIEWPORT_MARGIN, Math.min(preferredRight, window.innerWidth - width - VIEWPORT_MARGIN));
    const below = Math.max(0, viewportBottom - rect.bottom - MENU_GAP - VIEWPORT_MARGIN);
    const above = Math.max(0, rect.top - viewportTop - MENU_GAP - VIEWPORT_MARGIN);
    // Prefer the reference's downward menu when it has usable room. In short
    // windows use the larger side, with scrolling rather than offscreen rows.
    const opensBelow = below >= 280 || below >= above;
    const next: ComposerMenuAnchor = {
      right,
      ...(opensBelow ? { top: rect.bottom + MENU_GAP } : { bottom: window.innerHeight - rect.top + MENU_GAP }),
      maxHeight: opensBelow ? below : above,
      maxWidth: width,
    };
    setAnchor((previous) => previous && previous.right === next.right && previous.top === next.top && previous.bottom === next.bottom && previous.maxHeight === next.maxHeight && previous.maxWidth === next.maxWidth ? previous : next);
  }, [preferredWidth, align, inputRef]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !inputRef?.current?.contains(target) && !menuRef.current?.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onClose();
      (inputRef?.current ?? triggerRef.current)?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', updateAnchor);
    window.addEventListener('scroll', updateAnchor, true);
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', updateAnchor);
    viewport?.addEventListener('scroll', updateAnchor);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateAnchor);
    const element = inputRef?.current?.closest('form') ?? inputRef?.current;
    if (element) observer?.observe(element);
    updateAnchor();

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('scroll', updateAnchor, true);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      viewport?.removeEventListener('resize', updateAnchor);
      viewport?.removeEventListener('scroll', updateAnchor);
      observer?.disconnect();
    };
  }, [isOpen, onClose, updateAnchor, inputRef]);

  return { triggerRef, menuRef, anchor, updateAnchor };
}
