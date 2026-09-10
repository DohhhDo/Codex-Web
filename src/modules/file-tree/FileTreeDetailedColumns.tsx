import { useTranslation } from 'react-i18next';

/** Rendered by FileTree in detailed view mode to label the name/size/modified/permissions columns. */
export default function FileTreeDetailedColumns() {
  const { t } = useTranslation();

  return (
    <div className="sticky top-0 z-10 mb-2 border-b border-border/60 bg-background py-3 pl-1 pr-8">
      <div className="grid grid-cols-12 gap-2 px-1 text-xs font-normal text-muted-foreground">
        <div className="col-span-5">{t('fileTree.name')}</div>
        <div className="col-span-2">{t('fileTree.size')}</div>
        <div className="col-span-3">{t('fileTree.modified')}</div>
        <div className="col-span-2">{t('fileTree.permissions')}</div>
      </div>
    </div>
  );
}

