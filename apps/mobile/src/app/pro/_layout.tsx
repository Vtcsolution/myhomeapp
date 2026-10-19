import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/providers/SessionProvider';

/** Professional area: only reachable with a technician session. */
export default function ProLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/welcome" />;
  if (session.role !== 'technician') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
