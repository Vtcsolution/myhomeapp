import { Redirect } from 'expo-router';
import { useSession } from '@/providers/SessionProvider';

/** Entry point: routes to the experience that matches the signed-in role. */
export default function Index() {
  const { session } = useSession();
  if (!session || session.role === 'admin') return <Redirect href="/welcome" />;
  if (session.role === 'technician') return <Redirect href="/pro" />;
  return <Redirect href={session.isNewUser ? '/profile-setup' : '/customer'} />;
}
