import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/shared/api';
import { hydrateChatDrafts } from '@/shared/chatDrafts';
import { hydrateUserPreferences } from '@/shared/userSettings';
import type { WorkspaceProfile, WorkspaceProfileUpdate } from '@/shared/types';

type AuthContextValue = {
  user: WorkspaceProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: WorkspaceProfileUpdate) => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

/** Used by sidebar, settings, tasks and websocket state to access the shared workspace. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

/** Used by App to load the persistent workspace without a local login or registration. */
export function AuthProvider({ children }: { children: ReactNode }) {
  // The server owns the display identity; all surfaces observe the same saved value.
  const [user, setUser] = useState<WorkspaceProfile | null>(null);
  // Initial workspace loading must finish before preferences and sockets use its owner.
  const [isLoading, setIsLoading] = useState(true);
  // Bootstrap errors offer a retry instead of falling back to a removed login form.
  const [error, setError] = useState<string | null>(null);

  // Ignore reads that started before a later save or refresh.
  const profileRequest = useRef(0);

  const refreshProfile = useCallback(async () => {
    const request = ++profileRequest.current;
    const response = await api.auth.user();
    if (!response.ok) throw new Error('Workspace unavailable');
    const payload = await response.json() as { user: WorkspaceProfile };
    if (!payload.user?.id) throw new Error('Workspace unavailable');
    if (request !== profileRequest.current) return;
    setUser(payload.user);
    setError(null);
  }, []);

  const updateProfile = useCallback(async (updates: WorkspaceProfileUpdate) => {
    ++profileRequest.current;
    const response = await api.auth.updateProfile(updates);
    if (!response.ok) throw new Error('Profile could not be saved');
    const payload = await response.json() as { user: WorkspaceProfile };
    // A focus-triggered read may have started while this save was in flight.
    ++profileRequest.current;
    setUser(payload.user);
  }, []);

  useEffect(() => {
    // Old local login credentials no longer control workspace access.
    localStorage.removeItem('auth-token');
    void refreshProfile().catch(() => setError('Workspace unavailable')).finally(() => setIsLoading(false));
  }, [refreshProfile]);

  useEffect(() => {
    if (!user?.id) return;
    void hydrateUserPreferences();
    void hydrateChatDrafts();
  }, [user?.id]);

  useEffect(() => {
    const refresh = () => { void refreshProfile().catch(() => {}); };
    window.addEventListener('focus', refresh);
    window.addEventListener('codex-account-changed', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('codex-account-changed', refresh);
    };
  }, [refreshProfile]);

  const value = useMemo(() => ({ user, isLoading, error, refreshProfile, updateProfile }), [user, isLoading, error, refreshProfile, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
