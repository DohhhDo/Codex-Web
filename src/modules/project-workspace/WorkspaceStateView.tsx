import { ArrowUpRightIcon as ArrowUpRight } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { FolderSimpleIcon as Folder } from '@phosphor-icons/react/dist/csr/FolderSimple';
import { SidebarSimpleIcon as PanelLeftOpen } from '@phosphor-icons/react/dist/csr/SidebarSimple';
import { useTranslation } from 'react-i18next';

import { useSetUiPreference } from '@/shared/context/UiPreferencesContext';
import { CodexWebMark } from '@/shared/ui';
import { useProjectSidebarState } from '@/modules/project-workspace/context/ProjectsStateContext';
import MobileMenuButton from '@/modules/project-workspace/MobileMenuButton';

type WorkspaceStateViewProps = {
  mode: 'loading' | 'empty';
  isMobile: boolean;
  onMenuClick: () => void;
};

/** Rendered by WorkspaceMain for loading or the project-selection home screen. */
export default function WorkspaceStateView({ mode, isMobile, onMenuClick }: WorkspaceStateViewProps) {
  const { t } = useTranslation();
  const setPreference = useSetUiPreference();
  const browseProjects = () => { setPreference('sidebarVisible', true); onMenuClick(); };
  const { sidebarSharedProps } = useProjectSidebarState();
  const { projects, onProjectSelect } = sidebarSharedProps;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="codex-home-header">{isMobile ? <MobileMenuButton onMenuClick={onMenuClick} compact /> : <span>Codex-Web</span>}</header>
      <main className="codex-home">
        <div className="codex-home-inner">
          <div className="codex-welcome-title">
            <CodexWebMark className="text-primary" />
            <h1>{t(mode === 'loading' ? 'mainContent.loading' : 'mainContent.chooseProject')}</h1>
          </div>
          <p className="codex-home-description text-center">{t(mode === 'loading' ? 'mainContent.settingUpWorkspace' : 'mainContent.selectProjectDescription')}</p>
          {mode === 'loading' ? <div role="status" className="mt-8 h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" /> : (
            <>
              <div className="codex-project-picker">
                <div className="flex items-center gap-2 px-4 pb-3 pt-4 text-xs text-muted-foreground"><Folder size={15} />{t('mainContent.openProject', { defaultValue: 'Open a project' })}</div>
                {projects.slice(0, 5).map((project) => (
                  <button type="button" key={project.projectId} onClick={() => onProjectSelect(project)} className="codex-project-choice">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{project.displayName}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{project.fullPath}</span></span>
                    <ArrowUpRight size={17} className="shrink-0 text-muted-foreground" />
                  </button>
                ))}
                {projects.length === 0 && <p className="px-4 pb-5 text-sm text-muted-foreground">{t('mainContent.createProjectDesktop')}</p>}
              </div>
              <button type="button" onClick={browseProjects} className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><PanelLeftOpen size={14} />{t('mainContent.browseProjects', { defaultValue: 'Browse projects in the sidebar' })}</button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
