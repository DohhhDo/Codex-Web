import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { DownloadSimpleIcon as Download } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { EyeIcon as Eye } from '@phosphor-icons/react/dist/csr/Eye';
import { FileTextIcon as FileText } from '@phosphor-icons/react/dist/csr/FileText';
import { ArrowsOutSimpleIcon as Maximize2 } from '@phosphor-icons/react/dist/csr/ArrowsOutSimple';
import { ArrowsInSimpleIcon as Minimize2 } from '@phosphor-icons/react/dist/csr/ArrowsInSimple';
import { MoonIcon as Moon } from '@phosphor-icons/react/dist/csr/Moon';
import { FloppyDiskIcon as Save } from '@phosphor-icons/react/dist/csr/FloppyDisk';
import { SparkleIcon as Sparkles } from '@phosphor-icons/react/dist/csr/Sparkle';
import { SunIcon as Sun } from '@phosphor-icons/react/dist/csr/Sun';
import { XIcon as X } from '@phosphor-icons/react/dist/csr/X';

import { cn } from '@/shared/utils';

type PrdEditorHeaderProps = {
  fileName: string;
  onFileNameChange: (nextFileName: string) => void;
  isNewFile: boolean;
  previewMode: boolean;
  onTogglePreview: () => void;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onDownload: () => void;
  onOpenGenerateTasks: () => void;
  canGenerateTasks: boolean;
  onSave: () => void;
  saving: boolean;
  saveSuccess: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
};

type HeaderIconButtonProps = {
  title: string;
  onClick: () => void;
  icon: ReactNode;
  active?: boolean;
};

function HeaderIconButton({ title, onClick, icon, active = false }: HeaderIconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 rounded-md min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center transition-colors',
        active
          ? 'text-muted-foreground dark:text-muted-foreground bg-accent dark:bg-accent/50'
          : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-secondary dark:hover:bg-secondary',
      )}
    >
      {icon}
    </button>
  );
}

/** Rendered by PrdEditorWorkspace inside the prd-editor module to hold the PRD filename field and the editor toolbar actions. */
export default function PrdEditorHeader({
  fileName,
  onFileNameChange,
  isNewFile,
  previewMode,
  onTogglePreview,
  wordWrap,
  onToggleWordWrap,
  isDarkMode,
  onToggleTheme,
  onDownload,
  onOpenGenerateTasks,
  canGenerateTasks,
  onSave,
  saving,
  saveSuccess,
  isFullscreen,
  onToggleFullscreen,
  onClose,
}: PrdEditorHeaderProps) {
  const fileNameInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex min-w-0 flex-shrink-0 items-center justify-between border-b border-border p-4 dark:border-border">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-primary">
          <FileText className="h-4 w-4 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <div className="flex min-w-0 flex-1 items-center rounded-md border border-border bg-background px-3 py-2 focus-within:border-border focus-within:ring-2 focus-within:ring-ring dark:border-border dark:bg-accent dark:focus-within:border-border dark:focus-within:ring-ring">
                <input
                  ref={fileNameInputRef}
                  type="text"
                  value={fileName}
                  onChange={(event) => onFileNameChange(event.target.value)}
                  className="min-w-0 flex-1 border-none bg-transparent text-base font-medium text-foreground placeholder-gray-400 outline-none dark:text-foreground dark:placeholder-gray-500 sm:text-sm"
                  placeholder="Enter PRD filename"
                  maxLength={100}
                />
                <span className="ml-1 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground sm:text-xs">
                  .txt
                </span>
              </div>

              <button
                onClick={() => fileNameInputRef.current?.focus()}
                className="p-1 text-muted-foreground transition-colors hover:text-muted-foreground dark:hover:text-muted-foreground"
                title="Focus filename input"
              >
                <PencilSimpleIcon className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="whitespace-nowrap rounded bg-accent px-2 py-1 text-xs text-muted-foreground dark:bg-accent dark:text-muted-foreground">
                PRD
              </span>
              {isNewFile && (
                <span className="whitespace-nowrap rounded bg-green-100 px-2 py-1 text-xs text-green-600 dark:bg-green-900 dark:text-green-300">
                  New
                </span>
              )}
            </div>
          </div>

          <p className="mt-1 truncate text-xs text-muted-foreground dark:text-muted-foreground sm:text-sm">
            Product Requirements Document
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 md:gap-2">
        <HeaderIconButton
          title={previewMode ? 'Switch to edit mode' : 'Preview markdown'}
          onClick={onTogglePreview}
          icon={<Eye className="h-5 w-5 md:h-4 md:w-4" />}
          active={previewMode}
        />

        <HeaderIconButton
          title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          onClick={onToggleWordWrap}
          icon={<span className="font-mono text-sm font-bold md:text-xs">WRAP</span>}
          active={wordWrap}
        />

        <HeaderIconButton
          title="Toggle theme"
          onClick={onToggleTheme}
          icon={
            isDarkMode ? (
              <Sun className="h-5 w-5 md:h-4 md:w-4" />
            ) : (
              <Moon className="h-5 w-5 md:h-4 md:w-4" />
            )
          }
        />

        <HeaderIconButton
          title="Download PRD"
          onClick={onDownload}
          icon={<Download className="h-5 w-5 md:h-4 md:w-4" />}
        />

        <button
          onClick={onOpenGenerateTasks}
          disabled={!canGenerateTasks}
          className={cn(
            'px-3 py-2 rounded-md disabled:opacity-50 flex items-center gap-2 transition-colors text-sm font-medium text-white min-h-[44px] md:min-h-0',
            'bg-primary hover:bg-primary',
          )}
          title="Generate tasks from PRD content"
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden md:inline">Generate Tasks</span>
        </button>

        <button
          onClick={onSave}
          disabled={saving}
          className={cn(
            'px-3 py-2 text-white rounded-md disabled:opacity-50 flex items-center gap-2 transition-colors min-h-[44px] md:min-h-0',
            saveSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary',
          )}
        >
          {saveSuccess ? (
            <>
              <CheckIcon className="h-5 w-5 md:h-4 md:w-4" aria-hidden />
              <span className="hidden sm:inline">Saved!</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save PRD'}</span>
            </>
          )}
        </button>

        <button
          onClick={onToggleFullscreen}
          className="hidden items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-white md:flex"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        <HeaderIconButton
          title="Close"
          onClick={onClose}
          icon={<X className="h-6 w-6 md:h-4 md:w-4" />}
        />
      </div>
    </div>
  );
}
