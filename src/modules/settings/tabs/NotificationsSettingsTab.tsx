import { SpinnerGapIcon as Loader2 } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { PlayIcon as Play } from '@phosphor-icons/react/dist/csr/Play';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui';
import { playChatCompletionSound } from '@/shared/utils';
import type { NotificationPreferencesState } from '@/shared/types';
import SettingsCard from '@/modules/settings/SettingsCard';
import SettingsRow from '@/modules/settings/SettingsRow';
import SettingsSection from '@/modules/settings/SettingsSection';
import SettingsToggle from '@/modules/settings/SettingsToggle';

type NotificationsSettingsTabProps = {
  notificationPreferences: NotificationPreferencesState;
  onNotificationPreferencesChange: (value: NotificationPreferencesState) => void;
  pushPermission: NotificationPermission | 'unsupported';
  isPushSubscribed: boolean;
  isPushLoading: boolean;
  onEnablePush: () => void;
  onDisablePush: () => void;
  isDesktop?: boolean;
  desktopNotifications?: {
    enabled: boolean;
    supported: boolean;
    connectedCount?: number;
    targetCount?: number;
    lastError?: string | null;
  } | null;
  onEnableDesktopNotifications?: () => void;
  onDisableDesktopNotifications?: () => void;
};

/** Rendered by Settings for the "notifications" tab, covering notification channels and events. */
export default function NotificationsSettingsTab({
  notificationPreferences,
  onNotificationPreferencesChange,
  pushPermission,
  isPushSubscribed,
  isPushLoading,
  onEnablePush,
  onDisablePush,
  isDesktop = false,
  desktopNotifications = null,
  onEnableDesktopNotifications,
  onDisableDesktopNotifications,
}: NotificationsSettingsTabProps) {
  const { t } = useTranslation('settings');

  const channelEnabled = isDesktop ? Boolean(desktopNotifications?.enabled) : isPushSubscribed;
  const channelSupported = isDesktop ? desktopNotifications?.supported !== false : pushPermission !== 'unsupported';
  const channelDenied = !isDesktop && pushPermission === 'denied';
  const channelLoading = !isDesktop && isPushLoading;
  const channelTitle = isDesktop
    ? t('notifications.desktop.title', { defaultValue: 'Notify this desktop app' })
    : t('notifications.webPush.title');
  const channelStatus = !channelSupported
    ? (isDesktop ? t('notifications.desktop.unsupported', { defaultValue: 'Desktop notifications are not supported on this system.' }) : t('notifications.webPush.unsupported'))
    : channelDenied ? t('notifications.webPush.denied')
    : channelEnabled ? (isDesktop ? t('notifications.desktop.enabled', { defaultValue: 'Desktop notifications are enabled' }) : t('notifications.webPush.enabled'))
    : undefined;
  const channelActionLabel = channelLoading ? t('notifications.webPush.loading')
    : isDesktop
      ? channelEnabled ? t('notifications.desktop.disable', { defaultValue: 'Disable desktop notifications' }) : t('notifications.desktop.enable', { defaultValue: 'Enable desktop notifications' })
      : channelEnabled ? t('notifications.webPush.disable') : t('notifications.webPush.enable');

  const toggleChannel = () => {
    if (isDesktop) {
      if (channelEnabled) onDisableDesktopNotifications?.();
      else onEnableDesktopNotifications?.();
    } else if (channelEnabled) onDisablePush();
    else onEnablePush();
  };

  return (
    <div className="codex-notifications space-y-8">
      <SettingsSection title={t('notifications.title')} description={t('notifications.description')}>
        <SettingsCard divided>
          <SettingsRow label={channelTitle} description={channelStatus}>
            {channelSupported && !channelDenied && (
              <Button type="button" variant={channelEnabled ? 'outline' : 'default'} size="sm" disabled={channelLoading} onClick={toggleChannel} className="h-auto min-h-9 max-w-full whitespace-normal text-left">
                {channelLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
                {channelActionLabel}
              </Button>
            )}
          </SettingsRow>
          {isDesktop && desktopNotifications?.lastError && <p role="status" className="py-3 text-sm text-red-600 dark:text-red-400">{desktopNotifications.lastError}</p>}
          <SettingsRow label={t('notifications.sound.title', { defaultValue: 'Sound' })} description={t('notifications.sound.description', { defaultValue: 'Play a short tone when a chat run finishes.' })}>
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => { void playChatCompletionSound({ force: true }); }} className="gap-2 text-muted-foreground">
                <Play className="h-4 w-4" />
                {t('notifications.sound.test', { defaultValue: 'Test sound' })}
              </Button>
              <SettingsToggle checked={notificationPreferences.channels.sound} ariaLabel={t('notifications.sound.title', { defaultValue: 'Sound' })} onChange={(sound) => onNotificationPreferencesChange({
                ...notificationPreferences,
                channels: { ...notificationPreferences.channels, sound },
              })} />
            </div>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>
      <SettingsSection title={t('notifications.events.title')}>
        <SettingsCard divided>
          {(['actionRequired', 'stop', 'error'] as const).map((event) => (
            <SettingsRow key={event} label={t(`notifications.events.${event}`)}>
              <SettingsToggle checked={notificationPreferences.events[event]} ariaLabel={t(`notifications.events.${event}`)} onChange={(enabled) => onNotificationPreferencesChange({
                ...notificationPreferences,
                events: { ...notificationPreferences.events, [event]: enabled },
              })} />
            </SettingsRow>
          ))}
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}
