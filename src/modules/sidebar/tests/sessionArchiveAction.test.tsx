import { fireEvent, render, screen } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import type { TFunction } from 'i18next';

import SessionOptions from '@/modules/sidebar/SessionOptions';

vi.mock('@/shared/hooks/useProviderCapabilities', () => ({ useSessionForkingProviders: () => new Set(['codex']) }));
vi.mock('@/modules/sidebar/hooks/useProviderSessionIdCopy', () => ({ useProviderSessionIdCopy: () => ({ copyState: 'idle', copyLabel: 'Copy ID', setOptionsOpen: vi.fn(), handleCopyAction: vi.fn(), isCopyPending: false, CopyStateIcon: () => null }) }));
vi.mock('@/shared/ui', () => ({ ActionMenu: ({ items }: { items: { key: string; label: string; onSelect: () => void }[] }) => <div>{items.map(item => <button key={item.key} onClick={item.onSelect}>{item.label}</button>)}</div> }));

const t = ((_key: string, fallback: string) => fallback) as TFunction;
function setup(isProcessing = false) {
  const onDeleteSession = vi.fn();
  render(<SessionOptions sessionId="s1" sessionName="A conversation" provider="codex" projectId="p1" isProcessing={isProcessing} isEditing={false} renameDraft="" onRenameDraftChange={vi.fn()} onStartEditingSession={vi.fn()} onCancelEditingSession={vi.fn()} onSaveEditingSession={vi.fn()} onDeleteSession={onDeleteSession} t={t} />);
  return onDeleteSession;
}

test('archive has a separate non-destructive intent; delete still opens confirmation', () => {
  const action = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Archive session' }));
  expect(action).toHaveBeenLastCalledWith('s1', 'A conversation', { archiveOnly: true });
  fireEvent.click(screen.getByRole('button', { name: 'Delete session' }));
  expect(action).toHaveBeenLastCalledWith('s1', 'A conversation');
});

test('a running session cannot be archived or deleted from its menu', () => {
  setup(true);
  expect(screen.queryByRole('button', { name: 'Archive session' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Delete session' })).toBeNull();
});
