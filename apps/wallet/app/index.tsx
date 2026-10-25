import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Loading } from '@/components/ui';

export default function Index() {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Redirect href="/sign-in" />;
  if (!user.emailVerified) return <Redirect href="/verify-email" />;
  return <Redirect href="/home" />;
}
