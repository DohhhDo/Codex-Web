import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import ComposerActionsMenu from '@/modules/chat/composer/ComposerActionsMenu';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }),
}));

const setup = (options: { hasDraft?: boolean; canSchedule?: boolean } = {}) => {
  const callbacks = {
    onAttach: vi.fn(), onCommands: vi.fn(), onSchedule: vi.fn(),
    onTokenUsage: vi.fn(), onClear: vi.fn(), onVoiceInput: vi.fn(),
  };
  render(<ComposerActionsMenu hasDraft canSchedule commandCount={16} tokenBudget={{ used: 1234 }} {...callbacks} {...options} />);
  const trigger = screen.getByRole('button', { name: 'Add files and tools' });
  fireEvent.click(trigger);
  return { trigger, callbacks };
};

describe('composer secondary actions', () => {
  test.each([
    ['input.attachFiles', 'onAttach'], ['input.showAllCommands', 'onCommands'],
    ['voice.input', 'onVoiceInput'], ['chat:misc.showTokenUsage', 'onTokenUsage'],
    ['input.clearInput', 'onClear'],
  ] as const)('%s runs its existing action and dismisses the popup', (label, callback) => {
    const { trigger, callbacks } = setup();
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(label) }));
    expect(callbacks[callback]).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test('empty drafts cannot be scheduled or cleared', () => {
    setup({ hasDraft: false, canSchedule: false });
    expect(screen.getByRole('menuitem', { name: 'schedule.trigger' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('menuitem', { name: 'input.clearInput' })).toBeNull();
  });

  test('keyboard navigation skips disabled actions and Escape restores focus', () => {
    const { trigger } = setup({ canSchedule: false });
    const first = screen.getByRole('menuitem', { name: 'input.attachFiles' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /input.showAllCommands/ }));
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'input.clearInput' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test('scheduling stays in one popup and commits one future timestamp', () => {
    const { callbacks } = setup();
    fireEvent.click(screen.getByRole('menuitem', { name: 'schedule.trigger' }));
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Back' }));
    expect(callbacks.onSchedule).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'schedule.trigger' }));
    const before = Date.now();
    fireEvent.click(screen.getByRole('menuitem', { name: /schedule.in.15 / }));
    const scheduled = callbacks.onSchedule.mock.calls[0][0] as Date;
    expect(scheduled.getTime()).toBeGreaterThanOrEqual(before + 15 * 60_000);
    expect(scheduled.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60_000);
    expect(callbacks.onSchedule).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  test('custom dates in the past cannot be submitted', () => {
    const { callbacks } = setup();
    fireEvent.click(screen.getByRole('menuitem', { name: 'schedule.trigger' }));
    fireEvent.change(screen.getByLabelText('schedule.customLabel'), { target: { value: '2000-01-01T12:00' } });
    const confirm = screen.getByRole('button', { name: 'schedule.confirm' });
    expect(confirm.hasAttribute('disabled')).toBe(true);
    fireEvent.click(confirm);
    expect(callbacks.onSchedule).not.toHaveBeenCalled();
  });

  test('the menu fits a narrow viewport when the add button is at the left edge', () => {
    const viewport = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(320);
    setup();
    const menu = screen.getByRole('menu');
    const width = Number.parseFloat(menu.style.width);
    const right = Number.parseFloat(menu.style.right);
    expect(width).toBeGreaterThan(200);
    expect(320 - width - right).toBeGreaterThanOrEqual(8);
    expect(right).toBeGreaterThanOrEqual(8);
    viewport.mockRestore();
  });
});
