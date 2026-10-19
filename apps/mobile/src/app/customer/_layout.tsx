import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/providers/SessionProvider';

/** Customer area: only reachable with a customer session and a completed profile. */
export default function CustomerLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/welcome" />;
  if (session.role !== 'customer') return <Redirect href="/" />;
  if (session.isNewUser) return <Redirect href="/profile-setup" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
