import { ArrowCounterClockwiseIcon as RotateCcw } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import { ShieldIcon as Shield } from '@phosphor-icons/react/dist/csr/Shield';
import { ShieldSlashIcon as ShieldOff } from '@phosphor-icons/react/dist/csr/ShieldSlash';
import { XIcon as X } from '@phosphor-icons/react/dist/csr/X';

type ShellHeaderProps = {
  projectPath: string;
  isConnected: boolean;
  isInitialized: boolean;
  isRestarting: boolean;
  hasSession: boolean;
  sessionDisplayNameShort: string | null;
  onDisconnect: () => void;
  onRestart: () => void;
  statusNewSessionText: string;
  statusInitializingText: string;
  statusRestartingText: string;
  disconnectLabel: string;
  disconnectTitle: string;
  restartLabel: string;
  restartTitle: string;
  disableRestart: boolean;
  showBypassToggle: boolean;
  bypassEnabled: boolean;
  onToggleBypass: () => void;
  bypassLabel: string;
  bypassTitle: string;
};

/** Rendered by Shell above the terminal to show connection status and the restart/disconnect actions. */
export default function ShellHeader({
  projectPath,
  isConnected,
  isInitialized,
  isRestarting,
  hasSession,
  sessionDisplayNameShort,
  onDisconnect,
  onRestart,
  statusNewSessionText,
  statusInitializingText,
  statusRestartingText,
  disconnectLabel,
  disconnectTitle,
  restartLabel,
  restartTitle,
  disableRestart,
  showBypassToggle,
  bypassEnabled,
  onToggleBypass,
  bypassLabel,
  bypassTitle,
}: ShellHeaderProps) {
  return (
    <div className="codex-terminal-toolbar flex-shrink-0 border-b border-border/60 bg-background px-4 py-3 sm:px-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 truncate text-xs text-muted-foreground" title={projectPath}>{projectPath}</p>
          <div className="flex min-w-0 items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-[#788c5d]' : 'bg-muted-foreground'}`} />

          {hasSession && sessionDisplayNameShort && (
            <span className="truncate text-xs text-muted-foreground" title={sessionDisplayNameShort}>{sessionDisplayNameShort}</span>
          )}

          {!hasSession && <span className="text-xs text-muted-foreground">{statusNewSessionText}</span>}

          {!isInitialized && <span className="text-xs text-muted-foreground">{statusInitializingText}</span>}

          {isRestarting && <span className="text-xs text-muted-foreground">{statusRestartingText}</span>}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {showBypassToggle && (
            <button
              type="button"
              onClick={onToggleBypass}
              aria-pressed={bypassEnabled}
              className={`codex-terminal-action ${bypassEnabled ? 'bg-primary text-primary-foreground' : ''}`}

              title={bypassTitle}
            >
              {bypassEnabled ? (
                <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{bypassLabel}</span>
            </button>
          )}

          {isConnected && (
            <button
              type="button"
              onClick={onDisconnect}
              className="codex-terminal-action"

              title={disconnectTitle}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{disconnectLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRestart}
            disabled={disableRestart}
            className="codex-terminal-action"

            title={restartTitle}
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isRestarting ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{restartLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
