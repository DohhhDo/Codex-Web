import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '@/shared/api';
import { Button, Dialog, DialogContent, DialogTitle, Input } from '@/shared/ui';

type Automation = { id: string; content: string; interval_minutes: number; next_run_at: number; enabled: number };
type Run = { id: string; started_at: number; status: string; error?: string };

/** Used by ChatInterface to create, edit, pause and inspect recurring tasks in the current session. */
export function CodexAutomationPanel({ open, sessionId, options, onClose }: { open: boolean; sessionId: string | null; options: Record<string, unknown>; onClose: () => void }) {
  const { t } = useTranslation('chat');
  // The server owns schedules; this snapshot refreshes after each explicit action.
  const [tasks, setTasks] = useState<Automation[]>([]);
  // Editing is a local draft until Save succeeds.
  const [draft, setDraft] = useState({ id: '', content: '', intervalMinutes: 1440 });
  // Busy/error state keeps failed saves visible and prevents duplicate submissions.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Run history is loaded only for the task the user expands.
  const [history, setHistory] = useState<{ id: string; rows: Run[] } | null>(null);
  const refresh = useCallback(async () => {
    if (!sessionId) return;
    const response = await api.automations.list(sessionId);
    if (!response.ok) throw new Error(t('codex.loadFailed'));
    const body = await response.json();
    setTasks(body.data ?? []);
  }, [sessionId, t]);
  useEffect(() => {
    setTasks([]); setHistory(null); setDraft({ id: '', content: '', intervalMinutes: 1440 }); setError(null);
    if (open) void refresh().catch((failure) => setError(String(failure.message)));
  }, [open, refresh]);
  const save = async (body: Record<string, unknown>) => {
    setBusy(true); setError(null);
    try {
      const response = await api.automations.save(body);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? result.message ?? t('codex.saveFailed'));
      await refresh();
      setDraft({ id: '', content: '', intervalMinutes: 1440 });
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}><DialogContent className="max-w-xl rounded-xl border border-border bg-background p-5">
    <div className="mb-4 flex justify-between"><DialogTitle>{t('codex.automations')}</DialogTitle><Button size="sm" variant="ghost" onClick={onClose}>{t('codex.close')}</Button></div>
    {!sessionId ? <p className="text-sm text-muted-foreground">{t('codex.sessionRequired')}</p> : <div className="max-h-[70dvh] overflow-y-auto">
      <form className="space-y-3 border-b border-border pb-4" onSubmit={(event) => { event.preventDefault(); void save({ ...draft, id: draft.id || undefined, sessionId, options }); }}>
        <label className="block text-sm">{t('codex.taskPrompt')}<textarea required value={draft.content} onChange={(event) => setDraft((previous) => ({ ...previous, content: event.target.value }))} className="mt-1 min-h-24 w-full rounded-md border border-input bg-background p-2" /></label>
        <div className="flex items-end gap-3"><label className="flex-1 text-sm">{t('codex.interval')}<Input type="number" min={15} max={525600} required value={draft.intervalMinutes} onChange={(event) => setDraft((previous) => ({ ...previous, intervalMinutes: Number(event.target.value) }))} /></label><Button type="submit" disabled={busy || !draft.content.trim()}>{t(draft.id ? 'codex.save' : 'codex.create')}</Button></div>
        <p className="text-xs text-muted-foreground">{t('codex.automationHint')}</p>
      </form>
      {error && <p role="alert" className="py-3 text-sm text-destructive">{error}</p>}
      {tasks.map((task) => <div key={task.id} className="border-b border-border py-3 last:border-0">
        <p className="whitespace-pre-wrap text-sm">{task.content}</p><p className="mt-1 text-xs text-muted-foreground">{task.enabled ? new Date(task.next_run_at).toLocaleString() : t('codex.goalStatus.paused')} · {task.interval_minutes} min</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void save({ id: task.id, enabled: !task.enabled })}>{t(task.enabled ? 'codex.pause' : 'codex.resume')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft({ id: task.id, content: task.content, intervalMinutes: task.interval_minutes })}>{t('codex.edit')}</Button>
          <Button size="sm" variant="ghost" onClick={async () => { try { const response = await api.automations.runs(task.id); if (!response.ok) throw new Error(t('codex.loadFailed')); const body = await response.json(); setHistory({ id: task.id, rows: body.data ?? [] }); } catch (failure) { setError(String(failure)); } }}>{t('codex.history')}</Button>
          <Button size="sm" variant="ghost" onClick={async () => { try { const response = await api.automations.remove(task.id); if (!response.ok) throw new Error(t('codex.saveFailed')); await refresh(); } catch (failure) { setError(String(failure)); } }}>{t('codex.delete')}</Button>
        </div>
        {history?.id === task.id && <div className="mt-2 space-y-2 text-xs text-muted-foreground">{!history.rows.length ? t('codex.noRuns') : history.rows.map((run) => <p key={run.id}>{new Date(run.started_at).toLocaleString()} · {t(`codex.runStatus.${run.status}`, { defaultValue: run.status })}{run.error ? ` · ${run.error}` : ''}</p>)}</div>}
      </div>)}
    </div>}
  </DialogContent></Dialog>;
}
