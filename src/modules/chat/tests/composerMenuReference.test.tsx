import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import ComposerModelMenu from '@/modules/chat/composer/ComposerModelMenu';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }),
}));

function setup(top = 300, bottom = 332) {
  const onSelectModel = vi.fn();
  const onSelectEffort = vi.fn();
  render(<ComposerModelMenu model="codex" modelOptions={[{ value: 'codex', label: 'Codex' }, { value: 'other', label: 'Other model' }]} effort="high" effortOptions={[{ value: 'low' }, { value: 'high' }]} modelsLoading={false} onSelectModel={onSelectModel} onSelectEffort={onSelectEffort} />);
  const trigger = screen.getByRole('button', { name: 'Select model and reasoning effort' });
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ top, bottom, left: 100, right: 220, width: 120, height: bottom - top, x: 100, y: top, toJSON: () => ({}) });
  fireEvent.click(trigger);
  return { trigger, onSelectModel, onSelectEffort };
}

describe('reference composer menus', () => {
  test('models are immediately selectable; choosing one closes the popup', () => {
    const { onSelectModel } = setup();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Other model' }));
    expect(onSelectModel).toHaveBeenCalledWith('other');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('reasoning has its own view and preserves the selection callback', () => {
    const { onSelectEffort } = setup();
    expect(screen.queryByRole('menuitemradio', { name: 'low' })).toBeNull();
    fireEvent.click(screen.getByRole('menuitem', { name: /Reasoning/ }));
    expect(screen.queryByRole('menuitemradio', { name: 'Other model' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: /Back/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'low' }));
    expect(onSelectEffort).toHaveBeenCalledWith('low');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test.each([[300, 332, 'top'], [700, 732, 'bottom']] as const)('keeps the menu inside the viewport for a trigger at %s', (top, bottom, side) => {
    const viewport = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    setup(top, bottom);
    const menu = screen.getByRole('menu');
    expect(menu.style[side]).not.toBe('');
    expect(Number.parseFloat(menu.style.maxHeight)).toBeLessThan(800);
    viewport.mockRestore();
  });

  test('a short viewport scrolls within actual available space', () => {
    const viewport = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(220);
    setup(110, 142);
    expect(Number.parseFloat(screen.getByRole('menu').style.maxHeight)).toBe(94);
    viewport.mockRestore();
  });
});
