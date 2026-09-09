import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import React from 'react';

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/ui';
import { CollapsibleSection } from '@/modules/chat/tools/CollapsibleSection';

type CollapsibleDisplayProps = {
  toolName: string;
  toolId?: string;
  title: string;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  onTitleClick?: () => void;
  children: React.ReactNode;
  showRawParameters?: boolean;
  rawContent?: string;
  className?: string;
  toolCategory?: string;
};

/**
 * Rendered by chat's ToolRenderer for tools configured to show their input and
 * result inside an expandable, section with a quiet shared surface.
 */
export const CollapsibleDisplay: React.FC<CollapsibleDisplayProps> = ({
  toolName,
  title,
  defaultOpen = false,
  action,
  badge,
  onTitleClick,
  children,
  showRawParameters = false,
  rawContent,
  className = '',
}) => {
  return (
    <div className={`codex-tool-surface my-2 ${className}`}>
      <CollapsibleSection
        title={title}
        toolName={toolName}
        open={defaultOpen}
        action={action}
        badge={badge}
        onTitleClick={onTitleClick}
      >
        {children}

        {showRawParameters && rawContent && (
          <Collapsible className="mt-2">
            <CollapsibleTrigger className="flex items-center gap-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground">
              <CaretRightIcon className="h-2.5 w-2.5 flex-shrink-0 transition-transform duration-150 data-[state=open]:rotate-90" aria-hidden />
              raw params
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-1 overflow-hidden whitespace-pre-wrap break-words rounded border border-border/40 bg-muted p-2 font-mono text-[11px] text-muted-foreground">
                {rawContent}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CollapsibleSection>
    </div>
  );
};
