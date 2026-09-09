import { TerminalWindowIcon } from '@phosphor-icons/react/dist/csr/TerminalWindow';
import { useTranslation } from 'react-i18next';

type StandaloneShellEmptyStateProps = {
  className: string;
};

/** Rendered by StandaloneShell when no project is selected, because a shell needs a working directory. */
export default function StandaloneShellEmptyState({ className }: StandaloneShellEmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className={`flex h-full items-center justify-center ${className}`}>
      <div className="max-w-sm px-6 text-center text-muted-foreground">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center">
          <TerminalWindowIcon className="h-7 w-7 text-muted-foreground" aria-hidden />
        </div>
        <h3 className="mb-2 text-base font-medium text-foreground">{t('misc.noProjectSelected')}</h3>
        <p>{t('misc.projectRequiredForShell')}</p>
      </div>
    </div>
  );
}
