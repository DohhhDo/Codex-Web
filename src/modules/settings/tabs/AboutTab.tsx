import { ArrowSquareOutIcon as ExternalLink } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { useTranslation } from 'react-i18next';

import { CodexWebMark } from '@/shared/ui';
import { APP_VERSION } from '@/shared/constants';

/** Rendered by Settings to identify Codex-Web and preserve upstream attribution. */
export default function AboutTab() {
  const { t } = useTranslation('settings');
  return (
    <div className="max-w-xl space-y-7 p-2">
      <CodexWebMark className="h-12 w-12 text-primary" />
      <div><h2 className="text-2xl font-medium">Codex-Web</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{t('about.codexDescription', { defaultValue: 'A local workspace for Codex. Continue conversations, explore your files, and review changes from your browser.' })}</p></div>
      <dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('about.version', { defaultValue: 'Base version' })}</dt><dd>{APP_VERSION}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('about.license', { defaultValue: 'License' })}</dt><dd>AGPL-3.0-or-later</dd></div></dl>
      <div className="border-t border-border pt-5"><p className="text-xs leading-6 text-muted-foreground">{t('about.upstreamAttribution', { defaultValue: 'Built on CloudCLI (siteboon/claudecodeui). Visual styling follows Anthropic’s public brand guidelines. Codex-Web is an independent project.' })}</p></div>
      <div className="flex flex-wrap gap-5 text-xs">
        <a href="https://github.com/DohhhDo/Codex-Web" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline">GitHub<ExternalLink size={13} /></a>
        <a href="https://github.com/siteboon/claudecodeui" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline">{t('about.upstreamSource', { defaultValue: 'Upstream source' })}<ExternalLink size={13} /></a>
        <a href="https://github.com/anthropics/skills/tree/main/skills/brand-guidelines" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline">{t('about.designSource', { defaultValue: 'Design guidelines' })}<ExternalLink size={13} /></a>
      </div>
    </div>
  );
}
