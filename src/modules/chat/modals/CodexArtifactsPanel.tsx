import { useTranslation } from 'react-i18next';

import type { ChatMessage } from '@/shared/types';
import { Button, Dialog, DialogContent, DialogTitle } from '@/shared/ui';

/** Used by ChatInterface to reopen generated documents through the existing preview, editor and download controls. */
export function CodexArtifactsPanel({ open, messages, onClose, onOpen }: { open: boolean; messages: ChatMessage[]; onClose: () => void; onOpen?: (path: string) => void }) {
  const { t } = useTranslation('chat');
  const paths = new Set<string>();
  for (const message of messages) {
    let input = message.toolInput;
    if (typeof input === 'string') { try { input = JSON.parse(input); } catch { continue; } }
    const path = (input as { file_path?: unknown } | undefined)?.file_path;
    if (typeof path === 'string' && /\.(html?|md|svg|png|jpe?g|pdf|csv|json|txt|pptx|xlsx|docx)$/i.test(path)) paths.add(path);
    for (const file of message.files ?? []) if (file.path) paths.add(file.path);
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}><DialogContent className="max-w-lg rounded-xl border border-border bg-background p-5">
    <div className="mb-4 flex justify-between"><DialogTitle>{t('codex.artifacts')}</DialogTitle><Button size="sm" variant="ghost" onClick={onClose}>{t('codex.close')}</Button></div>
    <p className="mb-3 text-xs text-muted-foreground">{t('codex.artifactHint')}</p>
    <div className="max-h-[55dvh] overflow-y-auto">{paths.size ? Array.from(paths).map((path) => <button key={path} type="button" className="block w-full break-all rounded-md px-2 py-3 text-left text-sm hover:bg-accent" onClick={() => { onOpen?.(path); onClose(); }}>{path}</button>) : <p className="text-sm text-muted-foreground">{t('codex.empty')}</p>}</div>
  </DialogContent></Dialog>;
}
