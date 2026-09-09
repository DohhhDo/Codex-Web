import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import TokenUsageSummary from '@/modules/chat/composer/TokenUsageSummary';
import { api } from '@/shared/api';

vi.mock('@/shared/api', () => ({ api: { providers: { authStatus: vi.fn() } } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }),
}));

beforeEach(() => {
  vi.mocked(api.providers.authStatus).mockResolvedValue(new Response(JSON.stringify({ data: { authenticated: true } })));
});

test('footer shows cached-input ratio and reported allowance, with clickable token details', () => {
  const onClick = vi.fn();
  render(<TokenUsageSummary compact onClick={onClick} usage={{
    used: 1200, inputTokens: 1000, outputTokens: 200, cacheReadTokens: 500,
    subscriptionLevel: 'plus', rateLimits: { primary: { usedPercent: 12, windowMinutes: 300 } },
  }} />);
  expect(screen.getByText('Cache 50%')).toBeTruthy();
  expect(screen.getByText('plus')).toBeTruthy();
  expect(screen.getByText('5h left 88%')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '1.2K Tokens' }));
  expect(onClick).toHaveBeenCalledOnce();
});

test('context capacity cannot appear as account balance and unknown cache stays unknown', () => {
  render(<TokenUsageSummary compact usage={{ used: 100, total: 200000, inputTokens: 100 }} />);
  expect(screen.getByText('Cache —')).toBeTruthy();
  expect(screen.getByText('Subscription —')).toBeTruthy();
  expect(screen.queryByText(/left/)).toBeNull();
});

test('zero cached tokens is a known zero hit rate', () => {
  render(<TokenUsageSummary compact usage={{ used: 100, inputTokens: 100, cacheReadTokens: 0 }} />);
  expect(screen.getByText('Cache 0%')).toBeTruthy();
});

test('new conversations can display account subscription without session usage', async () => {
  vi.mocked(api.providers.authStatus).mockResolvedValue(new Response(JSON.stringify({ data: { subscriptionLevel: 'pro' } })));
  render(<TokenUsageSummary compact providerLabel="Codex" usage={null} />);
  await waitFor(() => expect(screen.getByText('pro')).toBeTruthy());
  expect(screen.getByRole('button', { name: '— Tokens' }).hasAttribute('disabled')).toBe(true);
  expect(api.providers.authStatus).toHaveBeenCalledWith('codex');
});

test('missing subscription on API credentials displays API', async () => {
  vi.mocked(api.providers.authStatus).mockResolvedValue(new Response(JSON.stringify({ data: { method: 'api_key' } })));
  render(<TokenUsageSummary compact providerLabel="Codex" usage={null} />);
  await waitFor(() => expect(screen.getByText('API')).toBeTruthy());
});
