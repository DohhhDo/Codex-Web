import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

type SettingsCardProps = {
  children: ReactNode;
  className?: string;
  divided?: boolean;
};

/** Used by the settings module's appearance, browser-use, git and tasks tabs to group related settings rows. */
export default function SettingsCard({ children, className, divided }: SettingsCardProps) {
  return (
    <div
      className={cn(
        'codex-settings-card',
        divided && 'divide-y divide-border',
        className,
      )}
    >
      {children}
    </div>
  );
}
