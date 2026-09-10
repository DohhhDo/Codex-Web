import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { CaretDownIcon as ChevronDown } from '@phosphor-icons/react/dist/csr/CaretDown';
import { FileTextIcon as FileText } from '@phosphor-icons/react/dist/csr/FileText';
import { FolderSimplePlusIcon as FolderPlus } from '@phosphor-icons/react/dist/csr/FolderSimplePlus';
import { SpinnerGapIcon as Loader2 } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { ArrowsClockwiseIcon as RefreshCw } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { MagnifyingGlassIcon as Search } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { UploadSimpleIcon as Upload } from '@phosphor-icons/react/dist/csr/UploadSimple';
import { XIcon as X } from '@phosphor-icons/react/dist/csr/X';
import { useTranslation } from 'react-i18next';

import { Button, Input } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { MAX_FILE_UPLOAD_SIZE_LABEL } from '@/shared/constants';
import type { FileTreeViewMode } from '@/shared/types';

type FileTreeHeaderProps = {
  projectName?: string;
  projectPath?: string;
  viewMode: FileTreeViewMode;
  onViewModeChange: (mode: FileTreeViewMode) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  // Toolbar actions
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onUploadFiles?: (files: FileList) => void;
  onRefresh?: () => void;
  onCollapseAll?: () => void;
  // Loading state
  loading?: boolean;
  operationLoading?: boolean;
  isUploading?: boolean;
  uploadProgress?: number | null;
};

/** Rendered by FileTree to host the search box, view-mode switch and the create/upload/refresh/collapse actions. */
export default function FileTreeHeader({
  projectName,
  projectPath,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchQueryChange,
  onNewFile,
  onNewFolder,
  onUploadFiles,
  onRefresh,
  onCollapseAll,
  loading,
  operationLoading,
  isUploading,
  uploadProgress,
}: FileTreeHeaderProps) {
  const { t } = useTranslation();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleUploadInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files && files.length > 0) {
      onUploadFiles?.(files);
    }
    event.target.value = '';
  };

  return (
    <header className="shrink-0 space-y-4 border-b border-border/60 px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-medium text-foreground">{projectName || t('fileTree.files')}</h2>
          {projectPath && <p className="mt-1 truncate text-xs text-muted-foreground" title={projectPath}>{projectPath}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
          {onRefresh && <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={onRefresh} disabled={operationLoading || loading} title={t('fileTree.refresh')} aria-label={t('fileTree.refresh')}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></Button>}
          {onCollapseAll && <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={onCollapseAll} title={t('fileTree.collapseAll')} aria-label={t('fileTree.collapseAll')}><ChevronDown className="h-4 w-4" /></Button>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-muted-foreground">
        {onNewFile && <Button variant="ghost" size="sm" className="h-9 gap-2 px-2.5 text-xs font-normal" onClick={onNewFile} disabled={operationLoading}><FileText className="h-4 w-4" />{t('fileTree.context.newFile')}</Button>}
        {onNewFolder && <Button variant="ghost" size="sm" className="h-9 gap-2 px-2.5 text-xs font-normal" onClick={onNewFolder} disabled={operationLoading}><FolderPlus className="h-4 w-4" />{t('fileTree.context.newFolder')}</Button>}
        {onUploadFiles && <>
          <input ref={uploadInputRef} type="file" multiple className="hidden" onChange={handleUploadInputChange} tabIndex={-1} aria-hidden="true" />
          <Button variant="ghost" size="sm" className="h-9 gap-2 px-2.5 text-xs font-normal" onClick={() => uploadInputRef.current?.click()} disabled={operationLoading || isUploading} title={t('fileTree.uploadFiles', 'Upload files (max {{size}} each)', { size: MAX_FILE_UPLOAD_SIZE_LABEL })}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {t('fileTree.context.upload')}{isUploading && typeof uploadProgress === 'number' && <span className="tabular-nums">{uploadProgress}%</span>}
          </Button>
        </>}
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label={t('fileTree.searchPlaceholder')} placeholder={t('fileTree.searchPlaceholder')} value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} className="h-9 rounded-lg border-border/60 bg-muted/30 pl-9 pr-9 text-sm shadow-none" />
          {searchQuery && <Button variant="ghost" size="sm" className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 p-0" onClick={() => onSearchQueryChange('')} title={t('fileTree.clearSearch')} aria-label={t('fileTree.clearSearch')}><X className="h-3.5 w-3.5" /></Button>}
        </div>
        <select aria-label={t('fileTree.viewMode', 'File view')} value={viewMode} onChange={(event) => onViewModeChange(event.target.value as FileTreeViewMode)} className="h-9 max-w-[110px] shrink-0 rounded-lg border border-border/60 bg-background px-2 text-xs text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
          <option value="simple">{t('fileTree.simpleView')}</option>
          <option value="compact">{t('fileTree.compactView')}</option>
          <option value="detailed">{t('fileTree.detailedView')}</option>
        </select>
      </div>
    </header>
  );
}
