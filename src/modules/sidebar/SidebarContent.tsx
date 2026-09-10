import { type ReactNode } from 'react';
import { PulseIcon as Activity } from '@phosphor-icons/react/dist/csr/Pulse';
import { FolderSimpleIcon as Folder } from '@phosphor-icons/react/dist/csr/FolderSimple';
import { ChatCircleIcon as MessageSquare } from '@phosphor-icons/react/dist/csr/ChatCircle';
import { MagnifyingGlassIcon as Search } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import type { TFunction } from 'i18next';

import { ScrollArea } from '@/shared/ui';
import type { ArchivedProjectListItem, ArchivedSessionListItem, ConversationSearchResults, Project, RecentConversationListItem, ReleaseInfo, SearchProgress, SidebarProjectListProps, SidebarSearchMode } from '@/shared/types';
import { formatCompactAge, getAllSessions } from '@/modules/sidebar/utils/sidebarProjectFormatting';
import SidebarArchiveList from '@/modules/sidebar/SidebarArchiveList';
import SidebarFooter from '@/modules/sidebar/SidebarFooter';
import SidebarHeader from '@/modules/sidebar/SidebarHeader';
import SidebarProjectList from '@/modules/sidebar/SidebarProjectList';
import SidebarRecentConversations from '@/modules/sidebar/SidebarRecentConversations';

function HighlightedSnippet({ snippet, highlights }: { snippet: string; highlights: { start: number; end: number }[] }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const h of highlights) {
    if (h.start > cursor) {
      parts.push(snippet.slice(cursor, h.start));
    }
    parts.push(
      <mark key={h.start} className="rounded-sm bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-800">
        {snippet.slice(h.start, h.end)}
      </mark>
    );
    cursor = h.end;
  }
  if (cursor < snippet.length) {
    parts.push(snippet.slice(cursor));
  }
  return (
    <span className="min-w-0 flex-1 break-words text-xs leading-relaxed text-muted-foreground">
      {parts}
    </span>
  );
}

type SidebarContentProps = {
  isPWA: boolean;
  isMobile: boolean;
  isLoading: boolean;
  projects: Project[];
  runningSessionsCount: number;
  archivedProjects: ArchivedProjectListItem[];
  archivedSessions: ArchivedSessionListItem[];
  archivedSessionsCount: number;
  isArchivedSessionsLoading: boolean;
  recentConversations: RecentConversationListItem[];
  recentConversationsTotal: number;
  recentConversationsHasMore: boolean;
  isRecentConversationsLoading: boolean;
  isLoadingMoreRecentConversations: boolean;
  recentConversationsError: boolean;
  searchFilter: string;
  onSearchFilterChange: (value: string) => void;
  onClearSearchFilter: () => void;
  searchMode: SidebarSearchMode;
  onSearchModeChange: (mode: SidebarSearchMode) => void;
  conversationResults: ConversationSearchResults | null;
  isSearching: boolean;
  searchProgress: SearchProgress | null;
  onRestoreArchivedProject: (projectId: string) => void;
  onLoadMoreRecentConversations: () => void;
  onRetryRecentConversations: () => void;
  onArchivedSessionClick: (session: ArchivedSessionListItem) => void;
  onRestoreArchivedSession: (sessionId: string) => void;
  onDeleteArchivedSession: (session: ArchivedSessionListItem) => void;
  // Conversation result clicks pass back the DB projectId (or null when the
  // server couldn't resolve it). Consumers must handle the null case.
  onConversationResultClick: (projectId: string | null, sessionId: string, provider: string, messageTimestamp?: string | null, messageSnippet?: string | null) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onCreateProject: () => void;
  onCollapseSidebar: () => void;
  updateAvailable: boolean;
  restartRequired: boolean;
  releaseInfo: ReleaseInfo | null;
  latestVersion: string | null;
  currentVersion: string;
  onShowVersionModal: () => void;
  onShowSettings: () => void;
  projectListProps: SidebarProjectListProps;
  t: TFunction;
};

/** Rendered by Sidebar as the expanded panel body: header, project list, conversation/archive search results, recent conversations and footer. */
export default function SidebarContent({
  isPWA,
  isMobile,
  isLoading,
  projects,
  runningSessionsCount,
  archivedProjects,
  archivedSessions,
  archivedSessionsCount,
  isArchivedSessionsLoading,
  recentConversations,
  recentConversationsTotal,
  recentConversationsHasMore,
  isRecentConversationsLoading,
  isLoadingMoreRecentConversations,
  recentConversationsError,
  searchFilter,
  onSearchFilterChange,
  onClearSearchFilter,
  searchMode,
  onSearchModeChange,
  conversationResults,
  isSearching,
  searchProgress,
  onRestoreArchivedProject,
  onLoadMoreRecentConversations,
  onRetryRecentConversations,
  onArchivedSessionClick,
  onRestoreArchivedSession,
  onDeleteArchivedSession,
  onConversationResultClick,
  onRefresh,
  isRefreshing,
  onCreateProject,
  onCollapseSidebar,
  updateAvailable,
  restartRequired,
  releaseInfo,
  latestVersion,
  currentVersion,
  onShowVersionModal,
  onShowSettings,
  projectListProps,
  t,
}: SidebarContentProps) {
  const showConversationSearch = searchMode === 'conversations' && searchFilter.trim().length >= 2;
  const hasSearchResults = Boolean(
    conversationResults
    && (conversationResults.titleResults.length > 0 || conversationResults.results.length > 0),
  );
  const runningConversations: RecentConversationListItem[] = searchMode === 'running'
    ? projectListProps.filteredProjects.flatMap(project => getAllSessions(project)
      .filter(session => projectListProps.activeSessions.has(String(session.id)))
      .map(session => ({ sessionId: String(session.id), provider: session.__provider,
        projectId: project.projectId, projectDisplayName: project.displayName,
        sessionTitle: String(session.summary || session.name || session.id),
        lastActivity: typeof session.lastActivity === 'string' ? session.lastActivity : null })))
    : [];
  const isRenamingOnMobile = isMobile && projectListProps.activeRename !== null;

  return (
    <div
      className="codex-sidebar flex h-full flex-col md:w-[272px] md:select-none"
      style={{}}
    >
      <SidebarHeader
        isPWA={isPWA}
        isMobile={isMobile}
        isLoading={isLoading}
        projectsCount={projects.length}
        runningSessionsCount={runningSessionsCount}
        archivedSessionsCount={archivedSessionsCount}
        isArchivedSessionsLoading={isArchivedSessionsLoading}
        searchFilter={searchFilter}
        onSearchFilterChange={onSearchFilterChange}
        onClearSearchFilter={onClearSearchFilter}
        searchMode={searchMode}
        onSearchModeChange={onSearchModeChange}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        onCreateProject={onCreateProject}
        onNewChat={() => projectListProps.selectedProject ? projectListProps.onNewSession(projectListProps.selectedProject) : onCreateProject()}
        onCollapseSidebar={onCollapseSidebar}
        t={t}
      />

      <ScrollArea className="codex-sidebar-list flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        {showConversationSearch ? (
          isSearching && !conversationResults ? (
            <div className="px-4 py-12 text-center md:py-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted md:mb-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
              <p className="text-sm text-muted-foreground">{t('search.searching')}</p>
              {searchProgress && (
                <p className="mt-1 text-xs text-muted-foreground/60">
                  {t('search.projectsScanned', { count: searchProgress.scannedProjects })}/{searchProgress.totalProjects}
                </p>
              )}
            </div>
          ) : !isSearching && conversationResults && !hasSearchResults ? (
            <div className="px-4 py-12 text-center md:py-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted md:mb-3">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-base font-medium text-foreground md:mb-1">{t('search.noResults')}</h3>
              <p className="text-sm text-muted-foreground">{t('search.tryDifferentQuery')}</p>
            </div>
          ) : conversationResults && (hasSearchResults || isSearching) ? (
            <div className="space-y-4 px-2" aria-live="polite">
              {conversationResults.titleResults.length > 0 && (
                <section className="space-y-1" aria-labelledby="session-title-results-heading">
                  <div className="flex items-center justify-between px-1 py-0.5">
                    <h3
                      id="session-title-results-heading"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      {t('search.sessionTitles', 'Session')}
                    </h3>
                    <span className="text-[10px] tabular-nums text-muted-foreground/70">
                      {conversationResults.titleResults.length}
                    </span>
                  </div>

                  {conversationResults.titleResults.map((session) => {
                    const age = formatCompactAge(session.lastActivity, projectListProps.currentTime);

                    return (
                      <button
                        key={`${session.provider}-${session.sessionId}`}
                        type="button"
                        className="codex-conversation-link"
                        title={`${session.projectDisplayName} · ${session.provider} · ${age}`}
                        onClick={() => onConversationResultClick(
                          session.projectId,
                          session.sessionId,
                          session.provider,
                        )}
                      >
                        <span className="codex-conversation-status"><span className="codex-conversation-dot" aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1 truncate">{session.sessionTitle}</span>
                      </button>
                    );
                  })}
                </section>
              )}

              {(conversationResults.results.length > 0 || isSearching) && (
                <section className="space-y-3" aria-labelledby="conversation-content-results-heading">
                  <div className="flex items-center justify-between px-1 py-0.5">
                    <h3
                      id="conversation-content-results-heading"
                      className="text-[11px] font-medium text-muted-foreground"
                    >
                      {t('search.conversationContents', 'Conversation contents')}
                    </h3>
                    <span className="text-[10px] tabular-nums text-muted-foreground/70">
                      {t('search.matches', { count: conversationResults.totalMatches })}
                    </span>
                  </div>

                  {isSearching && searchProgress && (
                    <div className="space-y-1.5 px-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-muted-foreground/40 border-t-primary" />
                        <p className="text-[10px] text-muted-foreground/60">
                          {searchProgress.scannedProjects}/{searchProgress.totalProjects}
                        </p>
                      </div>
                      <div className="h-0.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all duration-300"
                          style={{
                            width: `${searchProgress.totalProjects > 0
                              ? Math.round((searchProgress.scannedProjects / searchProgress.totalProjects) * 100)
                              : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {conversationResults.results.map((projectResult) => (
                    <div key={projectResult.projectName} className="space-y-1">
                      <div className="flex items-center gap-1.5 px-1 py-1">
                        <Folder className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs font-normal text-foreground">
                          {projectResult.projectDisplayName}
                        </span>
                      </div>
                      {projectResult.sessions.map((session) => (
                        <button
                          key={`${projectResult.projectId ?? projectResult.projectName}-${session.sessionId}`}
                          className="w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/50"
                          onClick={() => onConversationResultClick(
                            // Pass the DB projectId (preferred) so the parent can
                            // cross-reference with the loaded projects list.
                            projectResult.projectId,
                            session.sessionId,
                            session.provider || session.matches[0]?.provider || 'claude',
                            session.matches[0]?.timestamp,
                            session.matches[0]?.snippet
                          )}
                        >
                          <div className="mb-1 flex items-center gap-1.5">
                            <MessageSquare className="h-3 w-3 flex-shrink-0 text-primary" />
                            <span className="truncate text-xs font-normal text-foreground">
                              {session.sessionSummary}
                            </span>
                            {session.provider && session.provider !== 'claude' && (
                              <span className="flex-shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] uppercase text-muted-foreground">
                                {session.provider}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 pl-4">
                            {session.matches.map((match, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                <span className="mt-0.5 flex-shrink-0 text-[10px] font-normal uppercase text-muted-foreground/60">
                                  {match.role === 'user' ? 'U' : 'A'}
                                </span>
                                <HighlightedSnippet
                                  snippet={match.snippet}
                                  highlights={match.highlights}
                                />
                              </div>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </section>
              )}
            </div>
          ) : null
        ) : searchMode === 'conversations' ? (
          <SidebarRecentConversations
            conversations={recentConversations}
            total={recentConversationsTotal}
            hasMore={recentConversationsHasMore}
            isLoading={isRecentConversationsLoading}
            isLoadingMore={isLoadingMoreRecentConversations}
            hasError={recentConversationsError}
            selectedSession={projectListProps.selectedSession}
            currentTime={projectListProps.currentTime}
            sessionActions={projectListProps}
            onConversationSelect={onConversationResultClick}
            onLoadMore={onLoadMoreRecentConversations}
            onRetry={onRetryRecentConversations}
            t={t}
          />
        ) : searchMode === 'running' ? (
          runningConversations.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Activity weight="duotone" className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
              <h3 className="text-sm font-medium">{t('running.emptyTitle')}</h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">{runningSessionsCount > 0 ? t('running.noMatchingSessions') : t('running.emptyDescription')}</p>
            </div>
          ) : (
            <SidebarRecentConversations conversations={runningConversations} total={runningConversations.length} hasMore={false} isLoading={false} isLoadingMore={false} hasError={false} selectedSession={projectListProps.selectedSession} currentTime={projectListProps.currentTime} sessionActions={projectListProps} onConversationSelect={onConversationResultClick} onLoadMore={onLoadMoreRecentConversations} onRetry={onRetryRecentConversations} t={t} />
          )
        ) : searchMode === 'archived' ? (
          <SidebarArchiveList projects={archivedProjects} sessions={archivedSessions} loading={isArchivedSessionsLoading} total={archivedSessionsCount} onOpen={onArchivedSessionClick} onRestore={onRestoreArchivedSession} onRestoreProject={onRestoreArchivedProject} onDelete={onDeleteArchivedSession} t={t} />
        ) : (
          <SidebarProjectList {...projectListProps} />
        )}
      </ScrollArea>

      {!isRenamingOnMobile && (
        <SidebarFooter
          updateAvailable={updateAvailable}
          restartRequired={restartRequired}
          releaseInfo={releaseInfo}
          latestVersion={latestVersion}
          currentVersion={currentVersion}
          onShowVersionModal={onShowVersionModal}
          onShowSettings={onShowSettings}
          t={t}
        />
      )}
    </div>
  );
}
