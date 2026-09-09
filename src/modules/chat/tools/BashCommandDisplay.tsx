import { TerminalWindowIcon } from '@phosphor-icons/react/dist/csr/TerminalWindow';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretRightIcon as ChevronRight } from '@phosphor-icons/react/dist/csr/CaretRight';
import { CopyIcon as Copy } from '@phosphor-icons/react/dist/csr/Copy';
import { CheckIcon as Check } from '@phosphor-icons/react/dist/csr/Check';

import { cn,copyTextToClipboard } from '@/shared/utils';
import { ToolStatusBadge } from '@/modules/chat/tools/ToolStatusBadge';
import { useIsExportingTranscript } from '@/modules/chat/context/TranscriptRenderContext';
import type { ToolStatus } from '@/shared/types';

type BashCommandDisplayProps = {
  command: string;
  description?: string;
  /** Combined stdout/stderr from the tool result (empty while running). */
  output?: string;
  isError?: boolean;
  status?: ToolStatus;
  defaultOpen?: boolean;
};

/**
 * Compact command disclosure with a shared neutral header and output surface.
 *
 * Rendered by chat's ToolRenderer for shell tools (Bash and friends).
 */
export const BashCommandDisplay: React.FC<BashCommandDisplayProps> = ({
  command,
  description,
  output,
  isError = false,
  status,
  defaultOpen = false,
}) => {
  const { t } = useTranslation();
  const trimmedOutput = (output || '').replace(/\s+$/, '');
  const hasOutput = trimmedOutput.length > 0;
  const outputLineCount = hasOutput ? trimmedOutput.split('\n').length : 0;
  const isRunning = status === 'running';
  // `open` is raised by an effect once output arrives (below). A document is
  // rendered without effects, so it would show every command and no output.
  const isExporting = useIsExportingTranscript();
  // Preserve the user’s disclosure choice as output arrives.
  const [openState, setOpen] = useState(false);
  const open = openState || isExporting;
  // Keep brief feedback after the command is copied.
  const [copied, setCopied] = useState(false);

  // Output often arrives after this component first mounts, so apply the
  // auto-open intent once when there is finally something to show. After that
  // the user is in control of the toggle. Errors intentionally do NOT
  // auto-expand — the red border and status badge already signal the failure,
  // and the output stays one click away.
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (!autoAppliedRef.current && hasOutput && defaultOpen) {
      autoAppliedRef.current = true;
      setOpen(true);
    }
  }, [hasOutput, defaultOpen]);

  const toggle = () => {
    if (hasOutput) {
      setOpen((prev) => !prev);
    }
  };

  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const didCopy = await copyTextToClipboard(command);
    if (!didCopy) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'codex-tool-surface group/cmd',
        isError && 'codex-tool-error',
      )}
    >
      {/* Command header — clickable when there is output to expand */}
      <div
        role={hasOutput ? 'button' : undefined}
        tabIndex={hasOutput ? 0 : undefined}
        aria-expanded={hasOutput ? open : undefined}
        onClick={toggle}
        onKeyDown={(event) => {
          if (hasOutput && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            toggle();
          }
        }}
        className={cn(
          'codex-tool-heading',
          hasOutput && 'cursor-pointer',
        )}
      >
        <TerminalWindowIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        {/* Not a <code> tag: the global `.chat-message code` rule forces
            `white-space: pre-wrap !important`, which would defeat `truncate`
            and render collapsed multi-line commands in full. */}
        <span
          className={cn(
            'min-w-0 flex-1 font-mono text-xs text-foreground',
            'truncate',
          )}
        >
          {command}
        </span>

        {isRunning && (
          <span className="h-2.5 w-2.5 flex-shrink-0 animate-spin rounded-full border-[1.5px] border-muted-foreground/30 border-t-primary" />
        )}
        {status && status !== 'running' && <ToolStatusBadge status={status} className="flex-shrink-0" />}
        {!open && hasOutput && !isRunning && (
          <span className="flex-shrink-0 text-[10px] tabular-nums text-muted-foreground/70 transition-opacity group-hover/cmd:opacity-0">
            {outputLineCount} {outputLineCount === 1 ? 'line' : 'lines'}
          </span>
        )}

        <button
          type="button"
          onClick={handleCopy}
          onKeyDown={(event) => event.stopPropagation()}
          className="codex-tool-copy"
          title={t('chat:misc.copyCommand')}
          aria-label={t('chat:misc.copyCommand')}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150', open && 'rotate-90', !hasOutput && 'invisible')} aria-hidden />
      </div>

      {description && !open && (
        <div className="truncate px-3 pb-3 pl-9 text-xs text-muted-foreground">
          {description}
        </div>
      )}

      {/* Expanded output */}
      {open && hasOutput && (
        <div className="codex-tool-content">
          {description && (
            <div className="mb-3 text-xs text-muted-foreground">{description}</div>
          )}
          <pre
            className={cn(
              'codex-tool-code max-h-80 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed',
              isError ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
            )}
          >
            <span className="codex-tool-command">{command}</span>
            {trimmedOutput}
          </pre>
        </div>
      )}
    </div>
  );
};
