import { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import React from 'react';

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useIsExportingTranscript } from '@/modules/chat/context/TranscriptRenderContext';

type CollapsibleSectionProps = {
  title: string;
  toolName?: string;
  open?: boolean;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  onTitleClick?: () => void;
  children: React.ReactNode;
  className?: string;
};

/**
 * Reusable collapsible section with consistent styling.
 *
 * Used by chat's CollapsibleDisplay so every expandable tool block shares one
 * header, chevron and border treatment.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  toolName,
  open = false,
  action,
  badge,
  onTitleClick,
  children,
  className = '',
}) => {
  // A document has no chevron to click, so a section that stays collapsed in
  // an export is simply content the reader can never reach.
  const isExporting = useIsExportingTranscript();

  return (
    <Collapsible defaultOpen={open || isExporting} className={cn('group/section', className)}>
      {/* When there's a clickable title (Edit/Write), only the chevron toggles collapse */}
      {onTitleClick ? (
        <div className="codex-tool-heading cursor-default">
          <CodeIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          {toolName && (
            <span className="flex-shrink-0 font-medium text-muted-foreground">{toolName}</span>
          )}
          {toolName && (
            <span className="flex-shrink-0 text-[10px] text-muted-foreground/40">/</span>
          )}
          <button
            onClick={onTitleClick}
            className="min-w-0 flex-1 truncate text-left font-mono text-foreground transition-colors hover:underline"
          >
            {title}
          </button>
          {badge && <span className="ml-auto flex-shrink-0">{badge}</span>}
          {action && <span className="ml-1 flex-shrink-0">{action}</span>}
          <CollapsibleTrigger aria-label={title} className="codex-tool-toggle">
            <CaretRightIcon className="h-3.5 w-3.5 transition-transform duration-150 group-data-[state=open]/section:rotate-90" aria-hidden />
          </CollapsibleTrigger>
        </div>
      ) : (
        <CollapsibleTrigger className="codex-tool-heading w-full">
          <CodeIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          {toolName && (
            <span className="flex-shrink-0 font-medium">{toolName}</span>
          )}
          {toolName && (
            <span className="flex-shrink-0 text-[10px] text-muted-foreground/40">/</span>
          )}
          <span className="min-w-0 flex-1 truncate text-left">{title}</span>
          {badge && <span className="ml-auto flex-shrink-0">{badge}</span>}
          {action && <span className="ml-1 flex-shrink-0">{action}</span>}
          <CaretRightIcon className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-data-[state=open]/section:rotate-90" aria-hidden />
        </CollapsibleTrigger>
      )}

      <CollapsibleContent>
        <div className="codex-tool-content">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
