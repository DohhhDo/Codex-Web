import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { TFunction } from 'i18next';
import { expect, test, vi } from 'vitest';

import SidebarHeader from '@/modules/sidebar/SidebarHeader';

const t = ((key: string) => key) as TFunction;
const noop = () => {};

function HeaderHarness({ onCreateProject = noop, onSearchModeChange = noop } = {}) {
  // Exercise the controlled filter contract when search is opened and dismissed.
  const [query, setQuery] = useState('');
  return <SidebarHeader isPWA={false} isMobile={false} isLoading={false} projectsCount={3} runningSessionsCount={0} archivedSessionsCount={0} isArchivedSessionsLoading={false} searchFilter={query} onSearchFilterChange={setQuery} onClearSearchFilter={() => setQuery('')} searchMode="projects" onSearchModeChange={onSearchModeChange} onRefresh={noop} isRefreshing={false} onCreateProject={onCreateProject} onNewChat={noop} onCollapseSidebar={noop} t={t} />;
}

test('search opens on demand; Escape clears the filter and restores trigger focus', () => {
  render(<HeaderHarness />);
  expect(screen.queryByRole('textbox')).toBeNull();
  const trigger = screen.getByRole('button', { name: 'projects.searchPlaceholder' });
  fireEvent.click(trigger);
  const input = screen.getByRole('textbox');
  expect(document.activeElement).toBe(input);
  fireEvent.change(input, { target: { value: 'example' } });
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger);
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
});

test('the project toolbar retains project creation and navigation callbacks', () => {
  const onCreateProject = vi.fn();
  const onSearchModeChange = vi.fn();
  render(<HeaderHarness onCreateProject={onCreateProject} onSearchModeChange={onSearchModeChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'tooltips.createProject' }));
  expect(onCreateProject).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'search.modeConversations' }));
  expect(onSearchModeChange).toHaveBeenCalledWith('conversations');
});
