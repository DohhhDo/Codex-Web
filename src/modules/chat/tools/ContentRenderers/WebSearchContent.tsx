import { MarkdownContent } from '@/modules/chat/tools/ContentRenderers/MarkdownContent';

/** Used by ToolRenderer to expose native search sources while preserving textual results from other providers. */
export function WebSearchContent({ content }: { content: string }) {
  let data: unknown;
  try { data = JSON.parse(content); } catch { return <MarkdownContent content={content} />; }
  const sources = new Map<string, { title: string; snippet: string }>();
  const visit = (value: unknown, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 6 || sources.size >= 100) return;
    if (Array.isArray(value)) { value.forEach((entry) => visit(entry, depth + 1)); return; }
    const row = value as Record<string, unknown>;
    const url = typeof row.url === 'string' ? row.url : typeof row.link === 'string' ? row.link : '';
    if (/^https?:\/\//i.test(url)) sources.set(url, { title: typeof row.title === 'string' ? row.title : url, snippet: typeof row.snippet === 'string' ? row.snippet : '' });
    for (const nested of Object.values(row)) if (typeof nested === 'object') visit(nested, depth + 1);
  };
  visit(data);
  if (!sources.size) return <pre className="whitespace-pre-wrap break-words text-xs">{content}</pre>;
  return <ul className="space-y-2 text-sm">{Array.from(sources, ([url, source]) => <li key={url}>
    <a href={url} target="_blank" rel="noreferrer" className="break-words underline underline-offset-2">{source.title}</a>
    {source.snippet && <p className="mt-1 text-xs text-muted-foreground">{source.snippet}</p>}
  </li>)}</ul>;
}
