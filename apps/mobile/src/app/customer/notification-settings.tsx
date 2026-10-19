import { CalendarCheck, Gift, MessageSquareText, Receipt } from 'lucide-react-native';
import { useState } from 'react';
import { ToggleRow } from '@/components/account/ToggleRow';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ScreenHeader } from '@/components/ui/Headers';
import { ListGroup } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { useLocale } from '@/providers/LocaleProvider';
import {
  type NotificationPreferences,
  readPreferences,
  writePreferences,
} from '@/services/preferences';

/**
 * Account → Notification preferences. Stored on this device; push delivery is
 * not connected in the demo, which the screen states plainly.
 */
export default function NotificationSettingsScreen() {
  const { t } = useLocale();
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    () => readPreferences().notifications,
  );
  const set = (key: keyof NotificationPreferences) => (value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    writePreferences({ notifications: next });
  };

  return (
    <Screen
      header={
        <ScreenHeader
          back
          fallbackHref="/customer/account"
          title={t('notificationSettings.title')}
          subtitle={t('notificationSettings.subtitle')}
        />
      }
    >
      <DemoNotice text={t('notificationSettings.demoNote')} />
      <ListGroup>
        <ToggleRow
          icon={CalendarCheck}
          title={t('notificationSettings.bookingUpdates')}
          body={t('notificationSettings.bookingUpdatesBody')}
          value={prefs.bookingUpdates}
          onChange={set('bookingUpdates')}
        />
        <ToggleRow
          icon={MessageSquareText}
          title={t('notificationSettings.messages')}
          body={t('notificationSettings.messagesBody')}
          value={prefs.messages}
          onChange={set('messages')}
        />
        <ToggleRow
          icon={Receipt}
          title={t('notificationSettings.payments')}
          body={t('notificationSettings.paymentsBody')}
          value={prefs.payments}
          onChange={set('payments')}
        />
        <ToggleRow
          icon={Gift}
          title={t('notificationSettings.offers')}
          body={t('notificationSettings.offersBody')}
          value={prefs.offers}
          onChange={set('offers')}
        />
      </ListGroup>
    </Screen>
  );
}
