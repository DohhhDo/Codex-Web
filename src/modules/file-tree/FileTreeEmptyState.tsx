import type { Icon as IconComponent } from '@phosphor-icons/react/lib';

type FileTreeEmptyStateProps = {
  icon: IconComponent;
  title: string;
  description: string;
};

/** Rendered by FileTreeBody for the load-failure, empty-project and no-search-match states. */
export default function FileTreeEmptyState({ icon: Icon, title, description }: FileTreeEmptyStateProps) {
  return (
    <div className="px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center">
        <Icon weight="duotone" className="h-8 w-8 text-muted-foreground" />
      </div>
      <h4 className="mb-1 font-medium text-foreground">{title}</h4>
      <p className="mx-auto max-w-xs break-words text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

