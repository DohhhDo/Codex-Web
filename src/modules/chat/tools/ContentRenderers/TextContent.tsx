import React from 'react';

type TextContentProps = {
  content: string;
  format?: 'plain' | 'json' | 'code';
  className?: string;
};

/**
 * Renders plain text, JSON, or code content
 * Used by: Raw parameters, generic text results, JSON responses
 *
 * Rendered by chat's ToolRenderer as the default content of a tool result.
 */
export const TextContent: React.FC<TextContentProps> = ({
  content,
  format = 'plain',
  className = ''
}) => {
  if (format === 'json') {
    let formattedJson = content;
    try {
      const parsed = JSON.parse(content);
      formattedJson = JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If parsing fails, use original content
      console.warn('Failed to parse JSON content:', e);
    }

    return (
      <pre className={`codex-tool-code overflow-auto font-mono text-xs text-foreground ${className}`}>
        {formattedJson}
      </pre>
    );
  }

  if (format === 'code') {
    return (
      <pre className={`codex-tool-code overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground ${className}`}>
        {content}
      </pre>
    );
  }

  // Plain text
  return (
    <div className={`mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 ${className}`}>
      {content}
    </div>
  );
};
