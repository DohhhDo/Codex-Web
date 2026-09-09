import { useTranslation } from 'react-i18next';

import { CodexWebMark } from '@/shared/ui';

/** Rendered by ProtectedRoute while authentication is loading. */
export default function AuthLoadingScreen() {
  const { t } = useTranslation('auth');
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center" role="status" aria-live="polite">
        <CodexWebMark className="mx-auto mb-4 h-14 w-14 text-primary" />
        <h1 className="codex-wordmark">Codex-Web</h1>
        <p className="sr-only">{t('misc.loadingState')}</p>
        <div aria-hidden="true" className="mx-auto mt-6 h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    </div>
  );
}
