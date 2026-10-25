import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { errorMessage } from '@/lib/api';
import { findUser, matchUser, useAdminUsers } from '@/lib/admin';
import type { WithId } from '@/lib/hooks';
import type { UserDoc } from '@air-wallet/core';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Empty, Field, Notice, Screen, Segmented, Text } from '@/components/ui';
import { AdminNav, Rows, UserRow } from '@/components/admin';

type Filter = 'all' | 'active' | 'suspended';
const LIMIT = 300;

export default function AdminUsers() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ status?: string }>();
  const [filter, setFilter] = useState<Filter>(params.status === 'suspended' ? 'suspended' : 'all');
  const [term, setTerm] = useState('');
  const [found, setFound] = useState<WithId<UserDoc> | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const users = useAdminUsers(LIMIT, filter === 'all' ? undefined : filter).data;

  const shown = useMemo(() => (users ?? []).filter((u) => matchUser(u, term)), [users, term]);

  // Older accounts may be outside the loaded list: look them up exactly on the server.
  const lookup = async () => {
    setBusy(true);
    setErr('');
    try {
      setFound(await findUser(term));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen maxWidth={900}>
      <AdminNav />
      <Field
        label="Search"
        placeholder="Name, email, mobile or user ID"
        value={term}
        onChangeText={(v) => {
          setTerm(v);
          setFound(undefined);
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Segmented value={filter} onChange={setFilter} options={[
        { label: 'All', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Suspended', value: 'suspended' },
      ]} />

      {users !== undefined && (
        <Text size={12} color={colors.muted}>
          {shown.length} {shown.length === 1 ? 'user' : 'users'}{users.length >= LIMIT ? ` in the newest ${LIMIT}` : ''}
        </Text>
      )}

      {shown.length > 0 && <Rows items={shown} render={(u) => <UserRow u={u} />} />}

      {users !== undefined && shown.length === 0 && (
        <View style={{ gap: 10 }}>
          <Empty icon="user" text={term ? 'No match in the loaded users.' : filter === 'suspended' ? 'No suspended accounts.' : 'No users yet.'} />
          {term.trim().length >= 5 && (
            <>
              <Button title="Look up exact email or mobile" variant="secondary" onPress={lookup} loading={busy} />
              {found === null && <Notice text="No account with that exact email or mobile." />}
              {found && <Rows items={[found]} render={(u) => <UserRow u={u} />} />}
              {err ? <Notice text={err} tone="danger" /> : null}
            </>
          )}
        </View>
      )}
    </Screen>
  );
}
