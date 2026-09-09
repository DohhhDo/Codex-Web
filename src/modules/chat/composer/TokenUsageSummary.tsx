import { memo, useEffect, useState } from 'react';
import { PulseIcon as ActivityIcon } from '@phosphor-icons/react/dist/csr/Pulse';
import { useTranslation } from 'react-i18next';

import { api } from '@/shared/api';

type TokenUsageSummaryProps = {
  usage: Record<string, unknown> | null;
  onClick?: () => void;
  compact?: boolean;
  providerLabel?: string;
};

const formatTokenCount = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return '0';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 10_000) {
    return `${Math.round(value / 1_000)}K`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toLocaleString();
};

const readUsageNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Rendered by chat's ComposerActionsMenu and ChatComposer to show session usage
 * and open the detailed token breakdown on click.
 */
function TokenUsageSummary({ usage, onClick, compact = false, providerLabel }: TokenUsageSummaryProps) {
  const { t } = useTranslation();
  // Account metadata is independent of a conversation and contains no credentials.
  const [accountLevel, setAccountLevel] = useState<string | null>(null);
  useEffect(() => {
    if (!compact || providerLabel !== 'Codex') return;
    let active = true;
    api.providers.authStatus('codex').then(async response => {
      if (!response.ok) return;
      const payload = await response.json();
      const value = payload.data?.subscriptionLevel;
      if (active) setAccountLevel(typeof value === 'string' ? value : payload.data?.method === 'api_key' ? 'API' : null);
    }).catch(() => {});
    return () => { active = false; };
  }, [compact, providerLabel]);
  const breakdown =
    usage?.breakdown && typeof usage.breakdown === 'object'
      ? usage.breakdown as Record<string, unknown>
      : null;
  const inputTokens = readUsageNumber(usage?.inputTokens ?? breakdown?.input);
  const outputTokens = readUsageNumber(usage?.outputTokens ?? breakdown?.output);
  const usedTokens = readUsageNumber(usage?.used) || inputTokens + outputTokens;

  if (compact) {
    const cached = typeof usage?.cacheReadTokens === 'number' && Number.isFinite(usage.cacheReadTokens) ? usage.cacheReadTokens : null;
    const cacheRate = cached !== null && inputTokens > 0 ? Math.min(100, Math.max(0, cached / inputTokens * 100)) : null;
    const plan = (providerLabel === 'Codex' ? accountLevel : null) ?? (typeof usage?.subscriptionLevel === 'string' ? usage.subscriptionLevel : null);
    const limits = usage?.rateLimits && typeof usage.rateLimits === 'object' ? usage.rateLimits as Record<string, unknown> : {};
    const windows = ['primary', 'secondary'].flatMap(key => {
      const value = limits[key];
      if (!value || typeof value !== 'object') return [];
      const window = value as Record<string, unknown>;
      if (typeof window.usedPercent !== 'number' || !Number.isFinite(window.usedPercent)) return [];
      const minutes = typeof window.windowMinutes === 'number' ? window.windowMinutes : null;
      const period = minutes && minutes > 0 ? minutes % 1440 === 0 ? `${minutes / 1440}d` : minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}m` : '';
      const resets = typeof window.resetsAt === 'number' ? new Date(window.resetsAt * 1000).toLocaleString() : '';
      return [{ key, period, remaining: Math.max(0, Math.min(100, 100 - window.usedPercent)), resets }];
    });
    return (
      <div className="codex-usage-footer" aria-label={t('chat:composer.usageSummary', { defaultValue: 'Usage and subscription' })}>
        <button type="button" onClick={onClick} disabled={!usage} title={t('chat:misc.showTokenUsage')} className="hover:text-foreground disabled:cursor-default">
          {usage ? formatTokenCount(usedTokens) : '—'} Tokens
        </button>
        <span title={t('chat:composer.cacheDescription', { defaultValue: 'Cached input tokens / total input tokens' })}>
          {t('chat:composer.cache', { defaultValue: 'Cache' })} {cacheRate === null ? '—' : `${cacheRate.toFixed(0)}%`}
        </span>
        <span className="capitalize" title={t('chat:composer.subscription', { defaultValue: 'Subscription' })}>
          {plan || `${t('chat:composer.subscription', { defaultValue: 'Subscription' })} —`}
        </span>
        {windows.map(window => <span key={window.key} title={`${t('chat:composer.quotaSnapshot', { defaultValue: 'Latest reported account allowance' })}${window.resets ? ` · ${t('chat:composer.resetsAt', { defaultValue: 'Resets' })} ${window.resets}` : ''}`}>
          {window.period} {t('chat:composer.remaining', { defaultValue: 'left' })} {window.remaining.toFixed(0)}%
        </span>)}
      </div>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
      title={t('chat:misc.tokensUsed', { count: usedTokens })}
      aria-label={t('chat:misc.showTokenUsage')}
    >
      <ActivityIcon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{t('chat:misc.showTokenUsage')}</span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatTokenCount(usedTokens)}</span>
    </button>
  );
}

/** Memoized: the composer re-renders on every keystroke and this row's numbers only move when a turn ends. */
export default memo(TokenUsageSummary);
