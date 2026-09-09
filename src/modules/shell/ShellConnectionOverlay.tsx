import { SpinnerGapIcon as Loader2 } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { ArrowCounterClockwiseIcon as RotateCcw } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';

type ShellConnectionOverlayProps = {
  mode: 'loading' | 'connect' | 'connecting';
  description: string;
  loadingLabel: string;
  connectLabel: string;
  connectTitle: string;
  connectingLabel: string;
  onConnect: () => void;
};

/** Rendered by Shell on top of the terminal to show connect/loading state until the shell session is live. */
export default function ShellConnectionOverlay({
  mode,
  description,
  loadingLabel,
  connectLabel,
  connectTitle,
  connectingLabel,
  onConnect,
}: ShellConnectionOverlayProps) {
  if (mode === 'loading') {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </div>
      </div>
    );
  }

  if (mode === 'connect') {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-background p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-3 text-center">
          <button
            type="button"
            onClick={onConnect}
            className="pointer-events-auto inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-95"

            title={connectTitle}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span className="min-w-0 truncate">{connectLabel}</span>
          </button>
          <p className="max-w-md break-words px-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-3 text-center">
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="text-base font-medium">{connectingLabel}</span>
        </div>
        <p className="max-w-md break-words px-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
