import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { forgotSchema, z } from '@air-wallet/validation';
import { auth } from '@/lib/firebase';
import { Button, Field, Header, Notice, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export default function ForgotPassword() {
  const { colors } = useTheme();
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState } = useForm<z.input<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const submit = handleSubmit(async (v) => {
    // Same message whether or not the account exists (no user enumeration).
    await sendPasswordResetEmail(auth, v.email.trim()).catch(() => {});
    setSent(true);
  });

  return (
    <Screen>
      <Header title="Reset password" />
      <Text color={colors.muted}>Enter your email. We'll send a secure reset link.</Text>
      <Controller control={control} name="email" render={({ field, fieldState }) => (
        <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />
      )} />
      <Button title="Send reset link" onPress={submit} loading={formState.isSubmitting} />
      {sent ? <Notice tone="success" text="If an account exists for that email, a reset link is on its way." /> : null}
    </Screen>
  );
}
