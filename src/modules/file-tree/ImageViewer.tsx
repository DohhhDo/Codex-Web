import { useEffect, useState } from 'react';
import { XIcon as X } from '@phosphor-icons/react/dist/csr/X';
import { useTranslation } from 'react-i18next';

import { Button, Dialog, DialogContent, DialogTitle } from '@/shared/ui';
import { api } from '@/shared/api';
import type { FileTreeImageSelection } from '@/shared/types';

type ImageViewerProps = {
  file: FileTreeImageSelection;
  onClose: () => void;
};

/** Rendered by FileTree to preview an image file picked in the tree. */
export default function ImageViewer({ file, onClose }: ImageViewerProps) {
  const { t } = useTranslation();
  // Own the temporary object URL used by the active preview.
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  // Keep fetch failures visible in the preview.
  const [error, setError] = useState<string | null>(null);
  // Show progress until image bytes are ready.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    const controller = new AbortController();

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);
        setImageUrl(null);

        const response = await api.readFileBlob(file.projectId, file.path, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (loadError: unknown) {
        if (loadError instanceof Error && loadError.name === 'AbortError') {
          return;
        }
        console.error('Error loading image:', loadError);
        setError(t('fileTree.imageLoadFailed', 'Unable to load image'));
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.projectId, file.path, t]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="codex-dialog flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden p-0">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border/60 px-5 py-3">
          <DialogTitle className="min-w-0 truncate text-sm font-medium">{file.name}</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.close', 'Close')} className="h-9 w-9 shrink-0 p-0"><X className="h-4 w-4" /></Button>
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-background p-5">
          {loading && <p role="status" className="py-16 text-sm text-muted-foreground">{t('fileTree.imageLoading', 'Loading image…')}</p>}
          {!loading && imageUrl && <img src={imageUrl} alt={file.name} className="max-h-[65dvh] max-w-full object-contain" />}
          {!loading && !imageUrl && <p role="alert" className="py-16 text-sm text-muted-foreground">{error || t('fileTree.imageLoadFailed', 'Unable to load image')}</p>}
        </div>
        <footer className="shrink-0 border-t border-border/60 px-5 py-3"><p className="truncate text-xs text-muted-foreground" title={file.path}>{file.path}</p></footer>
      </DialogContent>
    </Dialog>
  );
}
