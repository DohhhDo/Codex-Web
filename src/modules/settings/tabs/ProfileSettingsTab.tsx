import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/modules/auth';
import { Onboarding } from '@/modules/onboarding';
import { Button, Input, Dialog, DialogContent } from '@/shared/ui';
import SettingsSection from '@/modules/settings/SettingsSection';

/** Used by Settings for workspace display identity and optional first-use guidance. */
export default function ProfileSettingsTab() {
  const { t } = useTranslation('settings');
  const { user, updateProfile, refreshProfile } = useAuth();
  // Draft overrides stay local until Save so previews never alter the saved sidebar identity.
  const [name, setName] = useState(user?.customDisplayName || '');
  // Null uses the current Codex avatar, while uploaded data stays in this draft until saved.
  const [avatar, setAvatar] = useState<string | null>(user?.customAvatarUrl || null);
  // Save status provides explicit progress, failure recovery and completion feedback.
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // Image validation is shown beside the upload controls without discarding the draft.
  const [imageError, setImageError] = useState(false);
  // First-use guidance is optional and can be closed without blocking the workspace.
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Prevent saving the previous avatar while a newly chosen image is still being decoded.
  const [isReadingAvatar, setIsReadingAvatar] = useState(false);
  const busy = status === 'saving' || isReadingAvatar;
  const fileRef = useRef<HTMLInputElement>(null);
  const previewName = name.trim() || user?.automaticDisplayName || user?.codex?.displayName || user?.codex?.email?.split('@')[0] || user?.username || 'Codex-Web';
  const previewAvatar = avatar || user?.codex?.avatarUrl;

  async function upload(file?: File) {
    if (!file) return;
    setStatus('idle');
    setImageError(false);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1_048_576) {
      setImageError(true);
      return;
    }
    setIsReadingAvatar(true);
    try {
      const bitmap = await createImageBitmap(file);
      if (!bitmap.width || !bitmap.height) throw new Error('Invalid image');
      bitmap.close();
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setAvatar(data);
    } catch { setImageError(true); } finally { setIsReadingAvatar(false); }
  }

  async function save() {
    if (busy) return;
    setStatus('saving');
    try {
      await updateProfile({ displayName: name.trim() || null, avatarUrl: avatar });
      setStatus('saved');
    } catch { setStatus('error'); }
  }

  return (
    <>
      <SettingsSection title={t('profile.title')} description={t('profile.description')}>
        <form className="space-y-6" onSubmit={event => { event.preventDefault(); void save(); }}>
          <div className="flex flex-wrap items-center gap-4 border-b border-border py-5">
            <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xl">
              {previewName.charAt(0).toUpperCase()}
              {previewAvatar && <img key={previewAvatar} src={previewAvatar} referrerPolicy="no-referrer" alt={t('profile.avatar')} className="absolute inset-0 h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />}
            </span>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>{t('profile.upload')}</Button>
                <Button type="button" variant="ghost" size="sm" disabled={!avatar || busy} onClick={() => { setAvatar(null); setStatus('idle'); }}>{t('profile.automaticAvatar')}</Button>
              </div>
              <p id="avatar-help" className="text-xs text-muted-foreground">{t('profile.imageHelp')}</p>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={t('profile.upload')} aria-describedby="avatar-help" tabIndex={-1} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
            </div>
          </div>
          {imageError && <p role="alert" className="text-sm text-destructive">{t('profile.imageError')}</p>}
          <div className="max-w-md space-y-2">
            <label htmlFor="workspace-display-name" className="text-sm font-medium">{t('profile.name')}</label>
            <Input id="workspace-display-name" value={name} maxLength={80} disabled={busy} placeholder={previewName} aria-describedby="name-help" onChange={event => { setName(event.target.value); setStatus('idle'); }} />
            <p id="name-help" className="text-xs leading-relaxed text-muted-foreground">{t('profile.nameHelp')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>{t(status === 'saving' ? 'profile.saving' : 'profile.save')}</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => { setName(''); setAvatar(null); setStatus('idle'); setImageError(false); }}>{t('profile.reset')}</Button>
            {status === 'saved' && <p role="status" className="text-sm text-muted-foreground">{t('profile.saved')}</p>}
            {status === 'error' && <p role="alert" className="text-sm text-destructive">{t('profile.saveError')}</p>}
          </div>
        </form>
      </SettingsSection>
      <SettingsSection title={t('profile.codexTitle')} description={t(user?.codex?.connected ? 'profile.codexConnected' : 'profile.codexDisconnected')}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3">
          <span className="min-w-0 break-all text-sm text-muted-foreground">{user?.codex?.email || t('profile.noAccount')}</span>
          <Button variant="outline" size="sm" onClick={() => { void refreshProfile().catch(() => setStatus('error')); }}>{t('profile.refresh')}</Button>
        </div>
      </SettingsSection>
      <SettingsSection title={t('profile.guideTitle')} description={t('profile.guideDescription')}>
        <Button variant="outline" onClick={() => setShowOnboarding(true)}>{t('profile.openGuide')}</Button>
      </SettingsSection>
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent wrapperClassName="z-[90]" className="codex-dialog max-w-2xl overflow-y-auto" aria-label={t('profile.guideTitle')}>
          <Button variant="ghost" className="absolute right-3 top-3 z-10" onClick={() => setShowOnboarding(false)}>{t('common:buttons.close')}</Button>
          <Onboarding onComplete={() => { setShowOnboarding(false); void refreshProfile().catch(() => {}); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}
