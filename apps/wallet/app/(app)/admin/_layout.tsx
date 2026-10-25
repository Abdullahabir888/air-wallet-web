import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Admin-only area. This guard just hides the screens; the real protection is server-side:
 * Firestore rules and every admin Cloud Function check the `admin` claim.
 */
export default function AdminLayout() {
  const { admin } = useAuth();
  const { colors } = useTheme();
  if (!admin) return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
