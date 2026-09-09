import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { useTranslation } from 'react-i18next';

type StandaloneShellHeaderProps = {
  title: string;
  isCompleted: boolean;
  onClose?: (() => void) | null;
};

/** Rendered by StandaloneShell's non-minimal layout to show the shell title, completion state and close button. */
export default function StandaloneShellHeader({
  title,
  isCompleted,
  onClose = null,
}: StandaloneShellHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex-shrink-0 border-b border-border bg-background px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {isCompleted && <span className="text-xs text-green-400">{t('misc.completedBadge')}</span>}
        </div>

        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" title={t('misc.close')}>
            <XIcon className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
