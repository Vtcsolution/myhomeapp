import { router } from 'expo-router';
import { NotificationsScreen } from '@/components/notifications/NotificationsList';
import { notificationTarget } from '@/lib/notifications';
import { customerRoutes } from '@/navigation/routes';

export default function CustomerNotifications() {
  return (
    <NotificationsScreen
      fallbackHref="/customer"
      onOpenSettings={() => router.push(customerRoutes.notificationSettings)}
      onOpen={(notification) => {
        const target = notificationTarget(notification);
        if (target?.kind === 'chat') router.push(customerRoutes.chat(target.id));
        else if (target?.kind === 'ticket') router.push(customerRoutes.ticket(target.id));
        else if (target?.kind === 'booking') router.push(customerRoutes.booking(target.id));
      }}
    />
  );
}
