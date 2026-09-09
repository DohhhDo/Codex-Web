import { TerminalWindowIcon } from '@phosphor-icons/react/dist/csr/TerminalWindow';
type ShellEmptyStateProps = {
  title: string;
  description: string;
};

/** Rendered by Shell in place of the terminal when no project is selected. */
export default function ShellEmptyState({ title, description }: ShellEmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-sm px-6 text-center text-muted-foreground">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center">
          <TerminalWindowIcon className="h-7 w-7 text-muted-foreground" aria-hidden />
        </div>
        <h3 className="mb-2 text-base font-medium text-foreground">{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}
