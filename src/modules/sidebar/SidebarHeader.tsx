import { FolderSimpleIcon as Folder } from '@phosphor-icons/react/dist/csr/FolderSimple';
import { ChatCircleIcon as MessageSquare } from '@phosphor-icons/react/dist/csr/ChatCircle';
import { PulseIcon as Activity } from '@phosphor-icons/react/dist/csr/Pulse';
import { ArchiveIcon as Archive } from '@phosphor-icons/react/dist/csr/Archive';
import { FolderSimplePlusIcon as FolderPlus } from '@phosphor-icons/react/dist/csr/FolderSimplePlus';
import { SidebarSimpleIcon as PanelLeftClose } from '@phosphor-icons/react/dist/csr/SidebarSimple';
import { ArrowsClockwiseIcon as RefreshCw } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { MagnifyingGlassIcon as Search } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { PlusIcon as Plus } from '@phosphor-icons/react/dist/csr/Plus';
import { useRef, useState } from 'react';
import { XIcon as X } from '@phosphor-icons/react/dist/csr/X';
import type { TFunction } from 'i18next';

import { CodexWebMark, Input, Tooltip } from '@/shared/ui';
import { cn } from '@/shared/utils';
import type { SidebarSearchMode } from '@/shared/types';

type SidebarHeaderProps = {
  isPWA: boolean;
  isMobile: boolean;
  isLoading: boolean;
  projectsCount: number;
  runningSessionsCount: number;
  archivedSessionsCount: number;
  isArchivedSessionsLoading: boolean;
  searchFilter: string;
  onSearchFilterChange: (value: string) => void;
  onClearSearchFilter: () => void;
  searchMode: SidebarSearchMode;
  onSearchModeChange: (mode: SidebarSearchMode) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onCreateProject: () => void;
  onNewChat: () => void;
  onCollapseSidebar: () => void;
  t: TFunction;
};

/** Rendered by SidebarContent for the brand, new chat action and session navigation. */
export default function SidebarHeader({
  isPWA, isMobile, runningSessionsCount, searchFilter, onSearchFilterChange,
  onClearSearchFilter, searchMode, onSearchModeChange, onRefresh, isRefreshing,
  onCreateProject, onNewChat, onCollapseSidebar, t,
}: SidebarHeaderProps) {
  // Search is an explicit tool; its query remains owned by the sidebar controller.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const showSearch = isSearchOpen || Boolean(searchFilter);
  const searchLabel = searchMode === 'projects' ? t('projects.searchPlaceholder') : t('search.conversationsPlaceholder');
  const closeSearch = () => {
    onClearSearchFilter();
    setIsSearchOpen(false);
    searchTriggerRef.current?.focus();
  };
  const modes = [
    { id: 'projects', icon: Folder, label: t('search.modeProjects') },
    { id: 'conversations', icon: MessageSquare, label: t('search.modeConversations') },
    { id: 'running', icon: Activity, label: t('search.modeRunning', 'Running') },
    { id: 'archived', icon: Archive, label: t('search.archiveOnlyTooltip', 'Archive') },
  ] as const;
  return (
    <div className="codex-sidebar-header" style={isPWA && isMobile ? { paddingTop: '24px' } : undefined}>
      <div className="codex-sidebar-brand flex items-center justify-between gap-2">
        <a href="/" className="flex min-w-0 items-center gap-2 text-foreground" aria-label="Codex-Web">
          <CodexWebMark className="h-6 w-6 shrink-0 text-primary" />
          <span className="codex-wordmark">Codex-Web</span>
        </a>
        {!isMobile && <button type="button" onClick={onCollapseSidebar} className="codex-icon-button" title={t('tooltips.hideSidebar')} aria-label={t('tooltips.hideSidebar')}><PanelLeftClose size={17} /></button>}
      </div>
      <button type="button" className="codex-new-chat" onClick={onNewChat}>
        <Plus size={18} /><span>{t('actions.newSession', { defaultValue: 'New chat' })}</span>
      </button>
      <nav className="codex-sidebar-navigation" aria-label={t('search.modeConversations')}>
        {modes.map(({ id, icon: Icon, label }) => {
          const runningCount = id === 'running' ? runningSessionsCount : 0;
          const accessibleLabel = runningCount > 0 ? `${label} (${runningCount})` : label;
          return (
            <Tooltip key={id} content={accessibleLabel} position="bottom">
              <button
                type="button"
                onClick={() => onSearchModeChange(id)}
                aria-label={accessibleLabel}
                title={accessibleLabel}
                aria-pressed={searchMode === id}
                className={cn('codex-nav-item', searchMode === id && 'is-active')}
              >
                <Icon size={18} className="shrink-0" weight={searchMode === id ? 'duotone' : 'regular'} />
                <span className="sr-only">{label}</span>
                {runningCount > 0 && <span className="codex-running-count" aria-hidden="true">{runningCount > 9 ? '9+' : runningCount}</span>}
              </button>
            </Tooltip>
          );
        })}
      </nav>
      <div className="codex-sidebar-list-heading">
        <span>{searchMode === 'conversations' ? t('recent.title', 'Recent conversations') : modes.find(({ id }) => id === searchMode)?.label}</span>
        <div className="flex items-center">
          {searchMode === 'projects' && (
            <Tooltip content={t('tooltips.createProject')} position="bottom">
              <button type="button" className="codex-icon-button" onClick={onCreateProject} aria-label={t('tooltips.createProject')}>
                <FolderPlus size={16} />
              </button>
            </Tooltip>
          )}
          <button ref={searchTriggerRef} type="button" className="codex-icon-button" aria-label={searchLabel} title={searchLabel} aria-expanded={showSearch} onClick={() => {
            if (showSearch) closeSearch();
            else setIsSearchOpen(true);
          }}><Search size={16} /></button>
          <button type="button" className="codex-icon-button" onClick={onRefresh} disabled={isRefreshing} aria-label={t('tooltips.refresh')} title={t('tooltips.refresh')}>
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      {showSearch && (
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            aria-label={searchLabel}
            placeholder={searchLabel}
            value={searchFilter}
            onChange={(event) => onSearchFilterChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); closeSearch(); } }}
            className="codex-sidebar-search h-9 pl-9 pr-9"
          />
          <button type="button" onClick={closeSearch} aria-label={t('tooltips.clearSearch')} className="codex-icon-button absolute right-0.5 top-1/2 -translate-y-1/2"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
