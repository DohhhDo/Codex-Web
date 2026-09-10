import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useWebSocket } from '@/shared/context/WebSocketContext';
import { Button } from '@/shared/ui';

type Goal = { objective: string; status: string; tokensUsed: number; tokenBudget: number | null; timeUsedSeconds: number };

/** Used by ChatInterface to keep native goal progress and controls beside the composer. */
export function CodexGoalBar({ sessionId, onResume }: { sessionId: string | null; onResume: () => void }) {
  const { t } = useTranslation('chat');
  const { sendMessage, subscribe, isConnected } = useWebSocket();
  // Goal belongs to the selected session and is restored from its persisted native state.
  const [snapshot, setSnapshot] = useState<{ sessionId: string; goal: Goal | null } | null>(null);
  // A rejected control remains visible without changing the running state.
  const [error, setError] = useState<string | null>(null);
  const goal = snapshot?.sessionId === sessionId ? snapshot.goal : null;
  useEffect(() => {
    if (!sessionId || !isConnected) return;
    const refresh = () => sendMessage({ type: 'chat.control', sessionId, action: 'goal', input: { operation: 'status' } });
    const unsubscribe = subscribe((event) => {
      if (event.sessionId !== sessionId) return;
      if (event.kind === 'status' && event.text === 'codex_goal') setSnapshot({ sessionId, goal: event.goal as Goal | null });
      if (event.kind === 'control_result' && event.action === 'goal') {
        if (event.error) { setError(String(event.error)); return; }
        setError(null);
        const result = event.result as { goal?: Goal | null } | undefined;
        if (result && 'goal' in result) setSnapshot({ sessionId, goal: result.goal ?? null });
        else refresh();
      }
      if (event.kind === 'complete') refresh();
    });
    refresh();
    return unsubscribe;
  }, [sessionId, isConnected, sendMessage, subscribe]);
  if (!goal) return null;
  return <div className="mx-auto mb-2 flex w-full max-w-[780px] flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs" aria-live="polite">
    <div className="min-w-0 flex-1">
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <p className="truncate text-foreground" title={goal.objective}>{goal.objective}</p>
      <p className="mt-1 text-muted-foreground">{t(`codex.goalStatus.${goal.status}`, { defaultValue: goal.status })} · {goal.tokensUsed.toLocaleString()}{goal.tokenBudget ? ` / ${goal.tokenBudget.toLocaleString()}` : ''} tokens · {Math.floor(goal.timeUsedSeconds / 60)} min</p>
    </div>
    {goal.status === 'active' ? <Button variant="ghost" size="sm" onClick={() => sendMessage({ type: 'chat.control', sessionId, action: 'goal', input: { operation: 'pause' } })}>{t('codex.pause')}</Button>
      : goal.status !== 'complete' && <Button variant="ghost" size="sm" onClick={onResume}>{t('codex.resume')}</Button>}
    <Button variant="ghost" size="sm" onClick={() => sendMessage({ type: 'chat.control', sessionId, action: 'goal', input: { operation: 'clear' } })}>{t('codex.clear')}</Button>
  </div>;
}
