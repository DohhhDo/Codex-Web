import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react/dist/csr/ArrowsOutSimple';
import { ArrowsInSimpleIcon } from '@phosphor-icons/react/dist/csr/ArrowsInSimple';

import type { CodeEditorFile } from '@/shared/types';

type CodeEditorBinaryFileProps = {
  file: CodeEditorFile;
  isSidebar: boolean;
  isFullscreen: boolean;
  onClose: () => void;
  onToggleFullscreen: () => void;
  title: string;
  message: string;
};

/** Rendered by CodeEditor inside the code-editor module when the opened file is binary and cannot be edited as text. */
export default function CodeEditorBinaryFile({
  file,
  isSidebar,
  isFullscreen,
  onClose,
  onToggleFullscreen,
  title,
  message,
}: CodeEditorBinaryFileProps) {
  const binaryContent = (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background p-8 text-muted-foreground">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileTextIcon className="h-8 w-8 text-muted-foreground" aria-hidden />
        </div>
        <div>
          <h3 className="mb-2 text-lg font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Close
        </button>
      </div>
    </div>
  );

  if (isSidebar) {
    return (
      <div className="flex h-full w-full flex-col bg-background">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-3 py-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white">{file.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            title="Close"
          >
            <XIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {binaryContent}
      </div>
    );
  }

  const containerClassName = isFullscreen
    ? 'fixed inset-0 z-[9999] bg-background flex flex-col'
    : 'fixed inset-0 z-[9999] md:bg-black/50 md:flex md:items-center md:justify-center md:p-4';

  const innerClassName = isFullscreen
    ? 'bg-background flex flex-col w-full h-full'
    : 'bg-background shadow-2xl flex flex-col w-full h-full md:rounded-lg md:shadow-2xl md:w-full md:max-w-2xl md:h-auto md:max-h-[60vh]';

  return (
    <div className={containerClassName}>
      <div className={innerClassName}>
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-3 py-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h3 className="truncate text-sm font-medium text-gray-900 dark:text-white">{file.name}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="flex items-center justify-center rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <ArrowsOutSimpleIcon className="h-4 w-4" aria-hidden />
              ) : (
                <ArrowsInSimpleIcon className="h-4 w-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              title="Close"
            >
              <XIcon className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        {binaryContent}
      </div>
    </div>
  );
}
