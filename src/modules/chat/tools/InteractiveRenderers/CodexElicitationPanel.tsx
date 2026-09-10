import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PermissionPanelProps } from '@/shared/types';
import { Button, Input } from '@/shared/ui';

type Field = { type?: string; title?: string; description?: string; enum?: Array<string | number>; minLength?: number; maxLength?: number; minimum?: number; maximum?: number; pattern?: string; format?: string };

/** Registered by PermissionRequestsBanner for MCP form and browser-flow requests from Codex. */
export function CodexElicitationPanel({ request, onDecision }: PermissionPanelProps) {
  const { t } = useTranslation('chat');
  const input = request.input as { mode?: string; message?: string; url?: string; requestedSchema?: { properties?: Record<string, Field>; required?: string[] } };
  // Values stay local until an explicit form submission; nothing is preapproved.
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const fields = Object.entries(input.requestedSchema?.properties ?? {});
  const supported = fields.every(([, field]) => ['string', 'number', 'integer', 'boolean'].includes(field.type ?? 'string'));
  const isUrl = input.mode === 'url';
  const validUrl = input.url && /^https?:\/\//.test(input.url) ? input.url : null;
  return <form className="rounded-xl border border-border bg-background p-4" onSubmit={(event) => {
    event.preventDefault();
    if (!supported || (isUrl && !validUrl)) return;
    const content: Record<string, string | number | boolean> = {};
    for (const [name, field] of fields) {
      const value = values[name];
      if (value === undefined || value === '') continue;
      content[name] = field.type === 'number' || field.type === 'integer' ? Number(value) : value;
    }
    onDecision(request.requestId, { allow: true, updatedInput: { content: isUrl ? null : content } });
  }}>
    <p className="mb-3 text-sm">{input.message}</p>
    {isUrl && validUrl && <a href={validUrl} target="_blank" rel="noreferrer" className="mb-3 block break-all text-sm underline">{t('codex.openLink')}</a>}
    {!supported && <p role="alert" className="mb-3 text-sm text-muted-foreground">{t('codex.unsupportedForm')}</p>}
    {!isUrl && supported && fields.map(([name, field]) => <label key={name} className="mb-3 block text-sm">
      <span className="mb-1 block">{field.title ?? name}</span>
      {field.description && <span className="mb-1 block text-xs text-muted-foreground">{field.description}</span>}
      {field.type === 'boolean' ? <select className="w-full rounded-md border border-input bg-background p-2" value={values[name] === undefined ? '' : String(values[name])} required={input.requestedSchema?.required?.includes(name)} onChange={(event) => setValues((previous) => ({ ...previous, [name]: event.target.value === 'true' }))}>
        <option value="" disabled>{t('codex.choose')}</option><option value="true">{t('codex.yes')}</option><option value="false">{t('codex.no')}</option>
      </select> : field.enum ? <select className="w-full rounded-md border border-input bg-background p-2" value={String(values[name] ?? '')} required={input.requestedSchema?.required?.includes(name)} onChange={(event) => setValues((previous) => ({ ...previous, [name]: event.target.value }))}>
        <option value="" disabled>{t('codex.choose')}</option>{field.enum.map((option) => <option key={String(option)} value={option}>{option}</option>)}
      </select> : <Input type={['number', 'integer'].includes(field.type ?? '') ? 'number' : field.format === 'email' ? 'email' : 'text'} step={field.type === 'integer' ? 1 : 'any'} value={String(values[name] ?? '')} required={input.requestedSchema?.required?.includes(name)} minLength={field.minLength} maxLength={field.maxLength} min={field.minimum} max={field.maximum} pattern={field.pattern} onChange={(event) => setValues((previous) => ({ ...previous, [name]: event.target.value }))} />}
    </label>)}
    <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => onDecision(request.requestId, { allow: false })}>{t('codex.decline')}</Button><Button type="submit" disabled={!supported || (isUrl && !validUrl)}>{t('codex.confirm')}</Button></div>
  </form>;
}
