import { SparkleIcon as Sparkles } from '@phosphor-icons/react/dist/csr/Sparkle';
import { XIcon as X } from '@phosphor-icons/react/dist/csr/X';

type CreateTaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/** Rendered by TaskBoard to explain how tasks are created through chat and the TaskMaster CLI. */
export default function CreateTaskModal({ isOpen, onClose }: CreateTaskModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background shadow-none dark:border-border dark:bg-secondary">
        <div className="flex items-center justify-between border-b border-border p-6 dark:border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent dark:bg-accent/50">
              <Sparkles className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground dark:text-foreground">Create AI-Generated Task</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-muted-foreground dark:hover:bg-accent dark:hover:text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-lg border border-border bg-accent p-4 dark:border-border dark:bg-accent/20">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent dark:bg-accent/50">
                <Sparkles className="h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div>
                <h4 className="mb-2 font-semibold text-foreground dark:text-muted-foreground">Pro tip: ask Claude Code directly</h4>
                <p className="mb-3 text-sm text-foreground dark:text-muted-foreground">
                  Ask for a task in chat with context and requirements. TaskMaster can generate implementation-ready tasks.
                </p>
                <div className="rounded border border-border bg-background p-3 dark:border-border dark:bg-secondary">
                  <p className="mb-1 text-xs font-medium text-muted-foreground dark:text-muted-foreground">Example:</p>
                  <p className="font-mono text-sm text-foreground dark:text-foreground">
                    Please add a task for profile image uploads and include best-practice research.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4 text-center dark:border-border">
            <a
              href="https://github.com/eyaltoledano/claude-task-master/blob/main/docs/examples.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-medium text-muted-foreground underline hover:text-muted-foreground dark:text-muted-foreground dark:hover:text-muted-foreground"
            >
              View TaskMaster documentation
            </a>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-background dark:border-border dark:bg-accent dark:text-muted-foreground dark:hover:bg-accent"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
