import { router } from 'expo-router';
import { NotificationsScreen } from '@/components/notifications/NotificationsList';
import { notificationTarget } from '@/lib/notifications';
import { proRoutes } from '@/navigation/routes';

export default function ProNotifications() {
  return (
    <NotificationsScreen
      fallbackHref="/pro"
      onOpenSettings={() => router.push(proRoutes.notificationSettings)}
      onOpen={(notification) => {
        const target = notificationTarget(notification);
        if (target?.kind === 'chat') router.push(proRoutes.chat(target.id));
        else if (target?.kind === 'booking') router.push(proRoutes.job(target.id));
      }}
    />
  );
}
