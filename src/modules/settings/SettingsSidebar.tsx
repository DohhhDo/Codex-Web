import { BellIcon as Bell } from '@phosphor-icons/react/dist/csr/Bell';
import { RobotIcon as Bot } from '@phosphor-icons/react/dist/csr/Robot';
import { GitBranchIcon as GitBranch } from '@phosphor-icons/react/dist/csr/GitBranch';
import { InfoIcon as Info } from '@phosphor-icons/react/dist/csr/Info';
import { KeyIcon as Key } from '@phosphor-icons/react/dist/csr/Key';
import { ListChecksIcon as ListChecks } from '@phosphor-icons/react/dist/csr/ListChecks';
import { MicrophoneIcon as Mic } from '@phosphor-icons/react/dist/csr/Microphone';
import { MonitorPlayIcon as MonitorPlay } from '@phosphor-icons/react/dist/csr/MonitorPlay';
import { PaletteIcon as Palette } from '@phosphor-icons/react/dist/csr/Palette';
import { PuzzlePieceIcon as Puzzle } from '@phosphor-icons/react/dist/csr/PuzzlePiece';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/utils';
import { PillBar, Pill } from '@/shared/ui';
import type { SettingsMainTab } from '@/shared/types';

type SettingsSidebarProps = {
  activeTab: SettingsMainTab;
  onChange: (tab: SettingsMainTab) => void;
};

type NavItem = {
  id: SettingsMainTab;
  labelKey: string;
  icon: typeof Bot;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'agents', labelKey: 'mainTabs.agents', icon: Bot },
  { id: 'appearance', labelKey: 'mainTabs.appearance', icon: Palette },
  { id: 'git', labelKey: 'mainTabs.git', icon: GitBranch },
  { id: 'api', labelKey: 'mainTabs.apiTokens', icon: Key },
  { id: 'voice', labelKey: 'mainTabs.voice', icon: Mic },
  { id: 'tasks', labelKey: 'mainTabs.tasks', icon: ListChecks },
  { id: 'browser', labelKey: 'mainTabs.browser', icon: MonitorPlay },
  { id: 'plugins', labelKey: 'mainTabs.plugins', icon: Puzzle },
  { id: 'notifications', labelKey: 'mainTabs.notifications', icon: Bell },
  { id: 'about', labelKey: 'mainTabs.about', icon: Info },
];

/** Rendered by Settings to switch between the settings dialog's main sections. */
export default function SettingsSidebar({ activeTab, onChange }: SettingsSidebarProps) {
  const { t } = useTranslation('settings');

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="codex-settings-nav hidden w-[210px] flex-shrink-0 md:flex md:flex-col">
        <h2 className="px-6 pb-5 pt-7 text-base font-semibold">{t('title')}</h2>
        <nav className="flex flex-col gap-0.5 px-3 pb-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground active:bg-accent/50',
                )}
              >
                <Icon weight={isActive ? 'duotone' : 'regular'} className="h-[18px] w-[18px] flex-shrink-0" />
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile horizontal nav — pill bar */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 md:hidden">
        <PillBar className="scrollbar-hide w-full overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <Pill
                key={item.id}
                isActive={activeTab === item.id}
                onClick={() => onChange(item.id)}
                className="flex-shrink-0"
              >
                <Icon weight={activeTab === item.id ? 'duotone' : 'regular'} className="h-4 w-4" />
                {t(item.labelKey)}
              </Pill>
            );
          })}
        </PillBar>
      </div>
    </>
  );
}
