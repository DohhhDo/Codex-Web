import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/modules/auth/context/AuthContext';
import ProtectedRoute from '@/modules/auth/ProtectedRoute';
import { api } from '@/shared/api';
vi.mock('@/shared/api', () => ({ api: { auth: { user: vi.fn(), updateProfile: vi.fn() } } }));
vi.mock('@/shared/chatDrafts', () => ({ hydrateChatDrafts: vi.fn() }));
vi.mock('@/shared/userSettings', () => ({ hydrateUserPreferences: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });
const profile = { id: 1, username: 'Local workspace', avatarUrl: null, customDisplayName: null, customAvatarUrl: null, codex: { connected: false } };
function Content() {
  const { user, updateProfile } = useAuth();
  return <><span>{user?.username}</span><button onClick={() => { void updateProfile({ displayName: 'Saved name', avatarUrl: null }); }}>Save</button></>;
}
test('a fresh browser and stale token both enter the workspace without login or onboarding', async () => {
  localStorage.setItem('auth-token', 'expired');
  vi.mocked(api.auth.user).mockResolvedValue(new Response(JSON.stringify({ user: profile })));
  vi.mocked(api.auth.updateProfile).mockResolvedValue(new Response(JSON.stringify({ user: { ...profile, username: 'Saved name' } })));
  render(<AuthProvider><ProtectedRoute><Content /></ProtectedRoute></AuthProvider>);
  expect(await screen.findByText('Local workspace')).toBeTruthy();
  expect(localStorage.getItem('auth-token')).toBeNull();
  fireEvent.click(screen.getByText('Save'));
  expect(await screen.findByText('Saved name')).toBeTruthy();
});
test('server failure offers retry and recovers without a login screen', async () => {
  vi.mocked(api.auth.user).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(new Response(JSON.stringify({ user: profile })));
  render(<AuthProvider><ProtectedRoute><Content /></ProtectedRoute></AuthProvider>);
  fireEvent.click(await screen.findByText('profile.retry'));
  await waitFor(() => expect(screen.getByText('Local workspace')).toBeTruthy());
});

test('a delayed background read cannot overwrite a profile saved while it was in flight', async () => {
  let finishSave!: (response: Response) => void;
  let finishRead!: (response: Response) => void;
  vi.mocked(api.auth.user).mockResolvedValueOnce(new Response(JSON.stringify({ user: profile }))).mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
  vi.mocked(api.auth.updateProfile).mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve; }));
  render(<AuthProvider><ProtectedRoute><Content /></ProtectedRoute></AuthProvider>);
  await screen.findByText('Local workspace');
  fireEvent.click(screen.getByText('Save'));
  fireEvent.focus(window);
  await act(async () => { finishSave(new Response(JSON.stringify({ user: { ...profile, username: 'Saved name' } }))); });
  await screen.findByText('Saved name');
  await act(async () => { finishRead(new Response(JSON.stringify({ user: profile }))); });
  expect(screen.getByText('Saved name')).toBeTruthy();
  expect(screen.queryByText('Local workspace')).toBeNull();
});
