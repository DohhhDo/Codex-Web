import { WarningIcon as AlertTriangle } from '@phosphor-icons/react/dist/csr/Warning';
import { GearSixIcon as Settings } from '@phosphor-icons/react/dist/csr/GearSix';
import type { TFunction } from 'i18next';

import type { ReleaseInfo } from '@/shared/types';
import { useAuth } from '@/modules/auth';

type SidebarFooterProps = {
  updateAvailable: boolean;
  restartRequired: boolean;
  releaseInfo: ReleaseInfo | null;
  latestVersion: string | null;
  currentVersion: string;
  onShowVersionModal: () => void;
  onShowSettings: () => void;
  t: TFunction;
};

/** Rendered by SidebarContent for the local account and settings entry. */
export default function SidebarFooter({ restartRequired, onShowSettings, t }: SidebarFooterProps) {
  const { user } = useAuth();
  const name = user?.displayName || user?.username || 'Codex-Web';
  const avatarUrl = typeof user?.avatarUrl === 'string' && /^(https:\/\/|data:image\/(png|jpeg|webp);base64,|\/(?!\/))/.test(user.avatarUrl) ? user.avatarUrl : null;
  return (
    <footer className="codex-sidebar-footer">
      {restartRequired && <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle size={14} />{t('version.restartRequired')}</p>}
      <button type="button" onClick={onShowSettings} className="codex-account-row flex w-full items-center gap-3 rounded-md px-2 text-left hover:bg-accent" aria-label={t('actions.settings')}>
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-medium">
          {name.charAt(0).toUpperCase()}
          {avatarUrl && <img key={avatarUrl} referrerPolicy="no-referrer" src={avatarUrl} alt={`${name} 头像`} className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
        <Settings size={17} className="text-muted-foreground" />
      </button>
    </footer>
  );
}
