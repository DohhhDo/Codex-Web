import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/modules/auth/context/AuthContext';
import AuthLoadingScreen from '@/modules/auth/AuthLoadingScreen';
import { Button } from '@/shared/ui';

/** Used by App to wait for workspace bootstrap; local login and onboarding never gate entry. */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation('settings');
  const { user, isLoading, refreshProfile } = useAuth();
  if (isLoading) return <AuthLoadingScreen />;
  if (!user) return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="codex-wordmark">Codex-Web</h1>
      <p role="alert" className="text-sm text-muted-foreground">{t('profile.workspaceUnavailable')}</p>
      <Button onClick={() => { void refreshProfile().catch(() => {}); }}>{t('profile.retry')}</Button>
    </main>
  );
  return <>{children}</>;
}
