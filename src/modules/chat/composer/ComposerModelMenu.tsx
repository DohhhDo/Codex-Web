import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CaretDownIcon as ChevronDown } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CaretLeftIcon as ChevronLeft } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRightIcon as ChevronRight } from '@phosphor-icons/react/dist/csr/CaretRight';

import type { ProviderModelOption } from '@/shared/types';
import { DEFAULT_EFFORT_VALUE } from '@/shared/constants';
import { useComposerMenuAnchor } from '@/modules/chat/hooks/useComposerMenuAnchor';
import {
  ComposerMenuItem,
  ComposerMenuSeparator,
  ComposerMenuSurface,
} from '@/modules/chat/composer/ComposerMenuPrimitives';

type EffortOption = NonNullable<ProviderModelOption['effort']>['values'][number];

type ComposerModelMenuProps = {
  effort: string;
  /** Effort values the active provider/model actually accepts; empty hides the section. */
  effortOptions: EffortOption[];
  onSelectEffort: (effort: string) => void;
  model: string;
  /** Model catalog for the active provider; empty hides the section. */
  modelOptions: ProviderModelOption[];
  onSelectModel: (model: string) => void;
  modelsLoading: boolean;
};

/**
 * Rendered by chat's ChatComposer as the popover for choosing the active
 * provider's model and reasoning effort for the next turn.
 */
function ComposerModelMenu({
  effort,
  effortOptions,
  onSelectEffort,
  model,
  modelOptions,
  onSelectModel,
  modelsLoading,
}: ComposerModelMenuProps) {
  const { t } = useTranslation('chat');
  // Preserve the model picker while the user inspects model and effort choices.
  const [isOpen, setIsOpen] = useState(false);
  // Keep reasoning details out of the model list until requested.
  const [isEffortSectionOpen, setIsEffortSectionOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const { triggerRef, menuRef, anchor, updateAnchor } = useComposerMenuAnchor(isOpen, close);

  // Each opening starts with the available models and a compact reasoning row.
  useEffect(() => {
    if (!isOpen) {
      setIsEffortSectionOpen(false);
    }
  }, [isOpen]);

  // A dedicated reasoning view avoids clipping its choices below a long model
  // list. Focus the selected option after switching views, including by keyboard.
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;
      menu.scrollTop = 0;
      const item = menu.querySelector<HTMLButtonElement>('[aria-checked="true"]')
        ?? menu.querySelector<HTMLButtonElement>('button');
      item?.focus({ preventScroll: true });
      item?.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, isEffortSectionOpen, menuRef]);

  const defaultEffortLabel = t('composer.effortDefault', { defaultValue: 'Default' });
  const resolvedEffortOptions = useMemo<EffortOption[]>(
    () => (effortOptions.length > 0 ? [{ value: DEFAULT_EFFORT_VALUE }, ...effortOptions] : []),
    [effortOptions],
  );
  const labelForEffort = (value: string) => value === DEFAULT_EFFORT_VALUE ? defaultEffortLabel : t(`composer.effortLevels.${value}`, { defaultValue: value });
  const effortLabel = labelForEffort(effort);

  const selectedModelOption = useMemo(
    () => modelOptions.find((option) => option.value === model) ?? null,
    [model, modelOptions],
  );
  const modelLabel = selectedModelOption?.label || model;

  const hasEffortSection = resolvedEffortOptions.length > 0;
  const hasModelSection = modelOptions.length > 0 || modelsLoading;
  if (!hasEffortSection && !hasModelSection) {
    return null;
  }

  const triggerLabel = hasModelSection ? modelLabel : effortLabel;
  const ariaLabel = t('composer.modelMenu', {
    defaultValue: 'Select model and reasoning effort',
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updateAnchor();
          setIsOpen((current) => !current);
        }}
        className="codex-composer-model"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <span className="truncate">{triggerLabel}</span>
        {hasModelSection && hasEffortSection && effort !== DEFAULT_EFFORT_VALUE && (
          <span className="shrink-0 text-muted-foreground">· {effortLabel}</span>
        )}
        <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
      </button>

      {isOpen && anchor && createPortal(
        <ComposerMenuSurface anchor={anchor} menuRef={menuRef} ariaLabel={ariaLabel}>
          {!isEffortSectionOpen && hasModelSection && (
            <>
              {modelOptions.length === 0 && modelsLoading && (
                <p className="px-2.5 py-2 text-sm text-muted-foreground">
                  {t('composer.loadingModels', { defaultValue: 'Loading models…' })}
                </p>
              )}
              <div>
                {modelOptions.map((option) => (
                  <ComposerMenuItem
                    key={option.value}
                    label={option.label || option.value}
                    isSelected={option.value === model}
                    onSelect={() => {
                      onSelectModel(option.value);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }}
                  />
                ))}
              </div>
            </>
          )}
          {hasEffortSection && (
            <>
              {!isEffortSectionOpen && hasModelSection && <ComposerMenuSeparator /> }
              <ComposerMenuItem
                role="menuitem"
                label={<span className="flex items-center justify-between gap-3">
                  <span>{isEffortSectionOpen ? t('composer.back', { defaultValue: 'Back' }) : t('composer.reasoning', { defaultValue: 'Reasoning' })}</span>
                  <span className="capitalize text-muted-foreground">{effortLabel}</span>
                </span>}
                isSelected={false}
                icon={isEffortSectionOpen ? <ChevronLeft className="h-4 w-4" /> : undefined}
                onSelect={() => setIsEffortSectionOpen((current) => !current)}
                trailing={isEffortSectionOpen
                  ? null
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              />
              {isEffortSectionOpen && <>
                <ComposerMenuSeparator />
                <p className="px-2.5 py-2 text-xs text-muted-foreground">{t('composer.reasoning', { defaultValue: 'Reasoning' })}</p>
              </>}
              {isEffortSectionOpen && resolvedEffortOptions.map((option) => (
                <ComposerMenuItem
                  key={option.value}
                  label={labelForEffort(option.value)}
                  description={option.description}
                  isSelected={option.value === effort}
                  onSelect={() => {
                    onSelectEffort(option.value);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="capitalize"
                />
              ))}
            </>
          )}
        </ComposerMenuSurface>,
        document.body,
      )}
    </>
  );
}

/** Memoized: the composer re-renders on every keystroke and none of this menu's props change while typing. */
export default memo(ComposerModelMenu);
