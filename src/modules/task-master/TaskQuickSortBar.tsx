import { ArrowDownIcon as ArrowDown } from '@phosphor-icons/react/dist/csr/ArrowDown';
import { ArrowUpIcon as ArrowUp } from '@phosphor-icons/react/dist/csr/ArrowUp';
import { ArrowsDownUpIcon as ArrowUpDown } from '@phosphor-icons/react/dist/csr/ArrowsDownUp';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/utils';
import type { TaskBoardSortField, TaskBoardSortOrder } from '@/shared/types';

type TaskQuickSortBarProps = {
  sortField: TaskBoardSortField;
  sortOrder: TaskBoardSortOrder;
  onSortChange: (field: TaskBoardSortField) => void;
};

function getSortIcon(field: TaskBoardSortField, currentField: TaskBoardSortField, currentOrder: TaskBoardSortOrder) {
  if (field !== currentField) {
    return <ArrowUpDown className="h-4 w-4" />;
  }

  return currentOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
}

/** Rendered by TaskBoardToolbar to switch the board's sort field and direction from a single row of buttons. */
export default function TaskQuickSortBar({ sortField, sortOrder, onSortChange }: TaskQuickSortBarProps) {
  const { t } = useTranslation('tasks');

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSortChange('id')}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm',
          sortField === 'id'
            ? 'bg-accent dark:bg-accent text-muted-foreground dark:text-muted-foreground'
            : 'bg-secondary dark:bg-secondary text-muted-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent',
        )}
      >
        {t('sort.id')} {getSortIcon('id', sortField, sortOrder)}
      </button>

      <button
        onClick={() => onSortChange('status')}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm',
          sortField === 'status'
            ? 'bg-accent dark:bg-accent text-muted-foreground dark:text-muted-foreground'
            : 'bg-secondary dark:bg-secondary text-muted-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent',
        )}
      >
        {t('sort.status')} {getSortIcon('status', sortField, sortOrder)}
      </button>

      <button
        onClick={() => onSortChange('priority')}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm',
          sortField === 'priority'
            ? 'bg-accent dark:bg-accent text-muted-foreground dark:text-muted-foreground'
            : 'bg-secondary dark:bg-secondary text-muted-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent',
        )}
      >
        {t('sort.priority')} {getSortIcon('priority', sortField, sortOrder)}
      </button>
    </div>
  );
}
