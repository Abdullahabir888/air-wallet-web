import { Link } from 'expo-router';
import { Screen, Text } from '@/components/ui';

export default function NotFound() {
  return (
    <Screen>
      <Text weight="bold" size={20} style={{ marginTop: 40 }}>Page not found</Text>
      <Link href="/"><Text weight="semibold">Go home</Text></Link>
    </Screen>
  );
}
