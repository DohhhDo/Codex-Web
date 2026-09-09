import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import NotificationsSettingsTab from '@/modules/settings/tabs/NotificationsSettingsTab';
import type { NotificationPreferencesState } from '@/shared/types';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key }) }));

const preferences: NotificationPreferencesState = { channels: { inApp: true, webPush: false, sound: true, desktop: false }, events: { actionRequired: true, stop: true, error: true } };
const noop = () => {};
function setup(overrides = {}) {
  const onNotificationPreferencesChange = vi.fn();
  const onEnablePush = vi.fn();
  const onDisablePush = vi.fn();
  render(<NotificationsSettingsTab notificationPreferences={preferences} onNotificationPreferencesChange={onNotificationPreferencesChange} pushPermission="default" isPushSubscribed={false} isPushLoading={false} onEnablePush={onEnablePush} onDisablePush={onDisablePush} {...overrides} />);
  return { onNotificationPreferencesChange, onEnablePush, onDisablePush };
}

test('sound and event switches preserve all other preferences', () => {
  const { onNotificationPreferencesChange } = setup();
  fireEvent.click(screen.getByRole('switch', { name: 'Sound' }));
  expect(onNotificationPreferencesChange).toHaveBeenLastCalledWith({ ...preferences, channels: { ...preferences.channels, sound: false } });
  fireEvent.click(screen.getByRole('switch', { name: 'notifications.events.error' }));
  expect(onNotificationPreferencesChange).toHaveBeenLastCalledWith({ ...preferences, events: { ...preferences.events, error: false } });
});

test('push controls enable or disable the existing subscription', () => {
  const { onEnablePush } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'notifications.webPush.enable' }));
  expect(onEnablePush).toHaveBeenCalledOnce();
});

test('denied notification permission provides an explanation instead of an unusable enable button', () => {
  setup({ pushPermission: 'denied' });
  expect(screen.queryByRole('button', { name: 'notifications.webPush.enable' })).toBeNull();
  expect(screen.getByText('notifications.webPush.denied')).toBeTruthy();
});

test('desktop controls keep the desktop callback independent of browser push', () => {
  const onDisableDesktopNotifications = vi.fn();
  const { onEnablePush } = setup({ isDesktop: true, desktopNotifications: { supported: true, enabled: true }, onEnableDesktopNotifications: noop, onDisableDesktopNotifications });
  fireEvent.click(screen.getByRole('button', { name: 'Disable desktop notifications' }));
  expect(onDisableDesktopNotifications).toHaveBeenCalledOnce();
  expect(onEnablePush).not.toHaveBeenCalled();
});
