import { Redirect, Stack, useSegments } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function AuthLayout() {
  const { user, ready } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const onVerify = segments[segments.length - 1] === 'verify-email';
  if (ready && user?.emailVerified) return <Redirect href="/home" />;
  if (ready && user && !user.emailVerified && !onVerify) return <Redirect href="/verify-email" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
