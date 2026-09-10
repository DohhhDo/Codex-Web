import { ArchiveIcon } from '@phosphor-icons/react/dist/csr/Archive';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import type { TFunction } from 'i18next';

import type { ArchivedProjectListItem, ArchivedSessionListItem } from '@/shared/types';
import { getAllSessions } from '@/modules/sidebar/utils/sidebarProjectFormatting';

type SidebarArchiveListProps = {
  projects: ArchivedProjectListItem[];
  sessions: ArchivedSessionListItem[];
  loading: boolean;
  total: number;
  onOpen: (session: ArchivedSessionListItem) => void;
  onRestore: (sessionId: string) => void;
  onRestoreProject: (projectId: string) => void;
  onDelete: (session: ArchivedSessionListItem) => void;
  t: TFunction;
};

/** Used by SidebarContent to show archived sessions and workspaces as quiet, restorable rows. */
export default function SidebarArchiveList({ projects, sessions, loading, total, onOpen, onRestore, onRestoreProject, onDelete, t }: SidebarArchiveListProps) {
  if (loading) {
    return <div role="status" className="space-y-4 px-5 py-6"><p className="text-xs text-muted-foreground">{t('archived.loadingTitle')}</p>{[0, 1, 2].map(index => <div key={index} className="h-3 w-3/4 animate-pulse rounded bg-muted" />)}</div>;
  }
  if (!projects.length && !sessions.length) {
    return <div className="px-6 py-10 text-center">
      <ArchiveIcon weight="duotone" className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
      <h3 className="text-sm font-medium">{total ? t('archived.noMatchingSessions') : t('archived.emptyTitle')}</h3>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">{total ? t('archived.tryDifferentSearch') : t('archived.emptyDescription')}</p>
    </div>;
  }
  const renderSession = (session: ArchivedSessionListItem, restoreIndividually: boolean) => (
    <div key={session.sessionId} className="group flex min-h-[42px] items-center gap-1 rounded-lg px-2 hover:bg-accent/60 md:min-h-[34px]">
      <button type="button" onClick={() => onOpen(session)} title={session.sessionTitle} className="min-w-0 flex-1 rounded py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        <span className="block truncate">{session.sessionTitle}</span>
      </button>
      {restoreIndividually && <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        <button type="button" onClick={() => onRestore(session.sessionId)} aria-label={`${t('archived.restore')}: ${session.sessionTitle}`} title={t('archived.restore')} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><ArrowCounterClockwiseIcon className="h-4 w-4" /></button>
        <button type="button" onClick={() => onDelete(session)} aria-label={`${t('archived.deletePermanently')}: ${session.sessionTitle}`} title={t('archived.deletePermanently')} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><TrashIcon className="h-4 w-4" /></button>
      </div>}
    </div>
  );
  // Group only for orientation; rows stay flat and the session title leads.
  const groups = new Map<string, ArchivedSessionListItem[]>();
  for (const session of sessions) {
    const key = session.projectId || session.projectPath || '';
    groups.set(key, [...(groups.get(key) || []), session]);
  }
  return <div className="space-y-5 px-2 pb-5">
    <p className="px-2 text-xs leading-5 text-muted-foreground">{t('archived.restoreHint')}</p>
    {projects.map(project => <section key={project.projectId}>
      <div className="mb-1 flex items-center justify-between gap-2 px-2">
        <h3 className="min-w-0 truncate text-xs text-muted-foreground" title={project.fullPath}>{project.displayName}</h3>
        <button type="button" onClick={() => onRestoreProject(project.projectId)} aria-label={`${t('archived.restoreProject')}: ${project.displayName}`} className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowCounterClockwiseIcon className="h-3.5 w-3.5" />{t('archived.restoreAction')}</button>
      </div>
      {getAllSessions(project).map(session => renderSession({
        sessionId: String(session.id), provider: session.__provider, projectId: project.projectId,
        projectPath: project.fullPath, projectDisplayName: project.displayName,
        sessionTitle: String(session.summary || session.name || session.id),
        createdAt: typeof session.created_at === 'string' ? session.created_at : null,
        updatedAt: typeof session.updated_at === 'string' ? session.updated_at : null,
        lastActivity: typeof session.lastActivity === 'string' ? session.lastActivity : null,
        isProjectArchived: true,
      }, false))}
    </section>)}
    {[...groups].map(([key, items]) => <section key={key}>
      <h3 className="mb-1 truncate px-2 text-xs leading-6 text-muted-foreground" title={items[0].projectPath || undefined}>{items[0].projectDisplayName || t('sessions.unnamed')}</h3>
      {items.map(session => renderSession(session, true))}
    </section>)}
  </div>;
}
