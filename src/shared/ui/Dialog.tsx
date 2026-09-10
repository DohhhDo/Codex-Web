import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/utils';

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  titleId: string;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

export function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error('Dialog components must be used within <Dialog>');
  return ctx;
}

type DialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

/** Used by the chat, command-palette, sidebar, file-tree and skills modules as the modal container. */
export const Dialog: React.FC<DialogProps> = ({ open: controlledOpen, onOpenChange: controlledOnOpenChange, defaultOpen = false, children }) => {
  // Uncontrolled consumers need local visibility; controlled dialogs use their owner state.
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const titleId = React.useId();
  const triggerRef = React.useRef<HTMLElement | null>(null) as React.MutableRefObject<HTMLElement | null>;
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      controlledOnOpenChange?.(next);
    },
    [isControlled, controlledOnOpenChange]
  );

  const value = React.useMemo(() => ({ open, onOpenChange, triggerRef, titleId }), [open, onOpenChange, titleId]);

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
};

/** Opens a Dialog from an arbitrary child element; used by the chat module. */
export const DialogTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ onClick, children, asChild, ...props }, ref) => {
    const { onOpenChange, triggerRef } = useDialog();

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        onOpenChange(true);
        onClick?.(e);
      },
      [onOpenChange, onClick]
    );

    // asChild: clone child element and compose onClick + capture ref
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          onOpenChange(true);
          child.props.onClick?.(e);
        },
        ref: (node: HTMLElement | null) => {
          triggerRef.current = node;
          // Forward the outer ref
          if (typeof ref === 'function') ref(node as any);
          else if (ref) (ref as React.MutableRefObject<any>).current = node;
        },
      });
    }

    return (
      <button
        ref={(node) => {
          triggerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="button"
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DialogTrigger.displayName = 'DialogTrigger';

type DialogContentProps = {
  onEscapeKeyDown?: () => void;
  onPointerDownOutside?: () => void;
  wrapperClassName?: string;
  animationClassName?: string;
} & React.HTMLAttributes<HTMLDivElement>;

// Only the topmost dialog handles keyboard input when a settings subdialog opens.
const dialogStack: symbol[] = [];
let bodyOverflowBeforeDialogs = '';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focus-trapped panel of Dialog, used by the chat, command-palette, sidebar, file-tree and skills modules. */
export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onEscapeKeyDown, onPointerDownOutside, wrapperClassName, animationClassName, ...props }, ref) => {
    const { open, onOpenChange, triggerRef, titleId } = useDialog();
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const dialogId = React.useRef(Symbol());
    const previousFocusRef = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
      if (!open) return;
      const id = dialogId.current;
      previousFocusRef.current = document.activeElement as HTMLElement;
      if (dialogStack.length === 0) {
        bodyOverflowBeforeDialogs = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      dialogStack.push(id);
      return () => {
        const index = dialogStack.indexOf(id);
        if (index !== -1) dialogStack.splice(index, 1);
        if (!dialogStack.length) document.body.style.overflow = bodyOverflowBeforeDialogs;
        const target = triggerRef.current || previousFocusRef.current;
        if (target?.isConnected) target.focus();
      };
    }, [open, triggerRef]);

    React.useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (dialogStack.at(-1) !== dialogId.current) return;
        if (e.key === 'Escape') {
          e.stopPropagation();
          e.stopImmediatePropagation();
          onEscapeKeyDown?.();
          onOpenChange(false);
          return;
        }

        // Focus trap: Tab / Shift+Tab cycle within the dialog
        if (e.key === 'Tab' && contentRef.current) {
          const focusable = Array.from(
            contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown, true);

      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }, [open, onOpenChange, onEscapeKeyDown]);

    // Auto-focus first focusable element on open
    React.useEffect(() => {
      if (open && contentRef.current) {
        // Small delay to let the portal render
        requestAnimationFrame(() => {
          const first = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
          first?.focus();
        });
      }
    }, [open]);

    if (!open) return null;

    return createPortal(
      <div className={cn('fixed inset-0 z-50', wrapperClassName)}>
        {/* Overlay */}
        <div
          className="fixed inset-0 animate-dialog-overlay-show bg-black/50"
          onClick={() => {
            onPointerDownOutside?.();
            onOpenChange(false);
          }}
          aria-hidden
        />
        {/* Content */}
        <div
          ref={(node) => {
            contentRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={props['aria-label'] ? undefined : titleId}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'codex-dialog rounded-xl border bg-popover text-popover-foreground',
            animationClassName ?? 'animate-dialog-content-show',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>,
      document.body
    );
  }
);
DialogContent.displayName = 'DialogContent';

/** Accessible title of Dialog, used by the chat, command-palette, sidebar, file-tree and skills modules. */
export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    const { titleId } = useDialog();
    return <h2 id={titleId} ref={ref} className={cn('sr-only', className)} {...props} />;
  }
);
DialogTitle.displayName = 'DialogTitle';

