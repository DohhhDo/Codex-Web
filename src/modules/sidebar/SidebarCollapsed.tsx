import { SidebarSimpleIcon as PanelLeftOpen } from '@phosphor-icons/react/dist/csr/SidebarSimple';
import { GearSixIcon as Settings } from '@phosphor-icons/react/dist/csr/GearSix';
import type { TFunction } from 'i18next';

import { CodexWebMark } from '@/shared/ui';

type SidebarCollapsedProps = {
  onExpand: () => void;
  onShowSettings: () => void;
  updateAvailable: boolean;
  restartRequired: boolean;
  onShowVersionModal: () => void;
  t: TFunction;
};

/** Rendered by Sidebar when only the compact navigation rail is visible. */
export default function SidebarCollapsed({ onExpand, onShowSettings, t }: SidebarCollapsedProps) {
  return (
    <div className="codex-sidebar flex h-full w-14 flex-col items-center gap-4 py-5">
      <CodexWebMark className="h-8 w-8 text-primary" />
      <button type="button" onClick={onExpand} className="codex-icon-button" aria-label={t('common:versionUpdate.ariaLabels.showSidebar')} title={t('common:versionUpdate.ariaLabels.showSidebar')}><PanelLeftOpen size={18} /></button>
      <button type="button" onClick={onShowSettings} className="codex-icon-button mt-auto" aria-label={t('actions.settings')} title={t('actions.settings')}><Settings size={18} /></button>
    </div>
  );
}
