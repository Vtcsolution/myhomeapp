import { NotificationsScreen } from '@/components/notifications/NotificationsList';
import { useNextStage } from '@/hooks/useNextStage';

export default function ProNotifications() {
  const nextStage = useNextStage();
  return (
    <NotificationsScreen
      fallbackHref="/pro"
      onOpen={(notification) => {
        if (notification.bookingId) nextStage('features.jobDetails', 6);
      }}
    />
  );
}
