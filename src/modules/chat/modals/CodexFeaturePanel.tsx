import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '@/shared/api';
import { useChatControls } from '@/modules/chat/hooks/useChatControls';
import { useWebSocket } from '@/shared/context/WebSocketContext';
import { Button, Dialog, DialogContent, DialogTitle, Input } from '@/shared/ui';

type FeatureRow = { status?: { type?: string }; preview?: string; id?: string; name?: string; description?: string; path?: string; isAccessible?: boolean; isEnabled?: boolean; enabled?: boolean; authStatus?: string; tools?: Record<string, unknown>; installUrl?: string };

/** Used by ChatInterface for native skill, connector and MCP discovery from slash commands. */
export function CodexFeaturePanel({ kind, workspacePath, sessionId, onClose, onInsert }: { kind: string | null; workspacePath?: string; sessionId?: string; onClose: () => void; onInsert: (text: string) => void }) {
  const { t } = useTranslation('chat');
  const { sendMessage, subscribe } = useWebSocket();
  const control = useChatControls(sendMessage, subscribe);
  // Keep the remote inventory separate from the user's local search query.
  const [rows, setRows] = useState<FeatureRow[]>([]);
  // Search filters loaded results without another provider round trip.
  const [query, setQuery] = useState('');
  // Request state makes unavailable accounts and failed discovery recoverable.
  const [request, setRequest] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  // Retry refreshes the native inventory while retaining the current modal.
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    setRows([]);
    setQuery('');
    setRequest({ loading: true, error: null });
    void (async () => {
      try {
        const all: FeatureRow[] = [];
        let cursor: string | undefined;
        do {
          const response = await api.codex.features(kind, workspacePath, cursor, sessionId);
          const body = await response.json();
          if (!response.ok) throw new Error(body.error?.message ?? body.message ?? 'Could not load Codex tools.');
          const data = body.data ?? {};
          all.push(...(kind === 'skills' ? (data.data ?? []).flatMap((entry: { skills?: FeatureRow[] }) => entry.skills ?? []) : data.data ?? []));
          cursor = data.nextCursor || undefined;
        } while (cursor && !cancelled);
        if (!cancelled) { setRows(all); setRequest({ loading: false, error: null }); }
      } catch (error) {
        if (!cancelled) setRequest({ loading: false, error: error instanceof Error ? error.message : String(error) });
      }
    })();
    return () => { cancelled = true; };
  }, [kind, workspacePath, sessionId, revision]);
  const filtered = rows.filter((row) => `${row.name ?? ''} ${row.description ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  return <Dialog open={Boolean(kind)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-w-lg rounded-xl border border-border bg-background p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><DialogTitle>{t(`codex.${kind}`, { defaultValue: kind ?? '' })}</DialogTitle><Button variant="ghost" size="sm" onClick={onClose}>{t('codex.close')}</Button></div>
      <Input aria-label={t('codex.search')} placeholder={t('codex.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="mt-3 max-h-[55dvh] overflow-y-auto" aria-busy={request.loading}>
        {request.loading && <p className="py-4 text-sm text-muted-foreground">{t('codex.loading')}</p>}
        {request.error && <div role="alert" className="py-3 text-sm"><p>{request.error}</p><Button variant="ghost" onClick={() => setRevision((value) => value + 1)}>{t('codex.retry')}</Button></div>}
        {!request.loading && !request.error && !filtered.length && <p className="py-4 text-sm text-muted-foreground">{t('codex.empty')}</p>}
        {filtered.map((row, index) => <div key={row.id ?? row.path ?? row.name ?? index} className="flex items-start gap-3 border-b border-border py-3 last:border-0">
          <div className="min-w-0 flex-1"><p className="break-words text-sm">{row.name ?? row.preview ?? row.id}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.description ?? row.authStatus ?? row.status?.type ?? ''}</p>{row.tools && <p className="mt-1 text-xs text-muted-foreground">{Object.keys(row.tools).join(' · ')}</p>}</div>
          {kind === 'agents' && row.status?.type === 'active' && <Button size="sm" variant="ghost" disabled={request.loading} onClick={async () => {
            if (!sessionId || !row.id) return;
            setRequest({ loading: true, error: null });
            try { await control(sessionId, 'agent', { operation: 'interrupt', threadId: row.id }); setRevision((value) => value + 1); }
            catch (error) { setRequest({ loading: false, error: error instanceof Error ? error.message : String(error) }); }
          }}>{t('codex.stopAgent')}</Button>}
          {!['mcp', 'agents'].includes(kind ?? '') && <Button size="sm" variant="ghost" disabled={row.enabled === false || row.isEnabled === false || row.isAccessible === false} onClick={() => { onInsert(kind === 'skills' ? `$${row.name} ` : `@app:${row.id} `); onClose(); }}>{t('codex.use')}</Button>}
          {row.isAccessible === false && row.installUrl && /^https:\/\//.test(row.installUrl) && <a className="text-xs underline" href={row.installUrl} target="_blank" rel="noreferrer">{t('codex.connect')}</a>}
        </div>)}
      </div>
    </DialogContent>
  </Dialog>;
}
