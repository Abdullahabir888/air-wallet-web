import { useState } from 'react';
import { useAdminAudit, useAdminUsers } from '@/lib/admin';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Empty, Screen, Text } from '@/components/ui';
import { AdminNav, AuditRow, namesOf, Rows } from '@/components/admin';

const PAGE = 50;

export default function AdminAudit() {
  const { colors } = useTheme();
  const [max, setMax] = useState(PAGE);
  const audit = useAdminAudit({ max }).data;
  const names = namesOf(useAdminUsers(200).data);

  return (
    <Screen maxWidth={900}>
      <AdminNav />
      <Text size={13} color={colors.muted}>
        Every admin action, card reveal, ATM redemption and nightly ledger check. Entries can't be edited or deleted from the app.
      </Text>
      {audit === undefined ? null : audit.length === 0 ? (
        <Empty icon="lock" text="Nothing logged yet." />
      ) : (
        <>
          <Rows items={audit} render={(a) => <AuditRow a={a} names={names} />} />
          {audit.length >= max && <Button title="Show more" variant="secondary" onPress={() => setMax((m) => m + PAGE)} />}
        </>
      )}
    </Screen>
  );
}
