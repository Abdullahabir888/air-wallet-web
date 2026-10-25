import { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { signInSchema, type SignInValues } from '@air-wallet/validation';
import { auth, usingEmulators } from '@/lib/firebase';
import { errorMessage } from '@/lib/api';
import { Button, Field, Notice, Screen, Text } from '@/components/ui';
import { Logo } from '@/components/wallet';
import { SocialButtons } from '@/components/SocialButtons';
import { useTheme } from '@/theme/ThemeProvider';

export default function SignIn() {
  const { colors } = useTheme();
  const [err, setErr] = useState('');
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (v) => {
    setErr('');
    try {
      await signInWithEmailAndPassword(auth, v.email.trim(), v.password);
    } catch (e) {
      setErr(errorMessage(e));
    }
  });

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 12, gap: 8 }}>
        <Logo height={56} />
        <Text weight="bold" size={24}>Welcome back</Text>
        <Text color={colors.muted}>Sign in to your wallet</Text>
      </View>
      <Controller control={control} name="email" render={({ field, fieldState }) => (
        <Field label="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
          value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} />
      )} />
      <Controller control={control} name="password" render={({ field, fieldState }) => (
        <Field label="Password" secureTextEntry autoComplete="password" textContentType="password"
          value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} onSubmitEditing={() => submit()} />
      )} />
      <Link href="/forgot-password" style={{ alignSelf: 'flex-end' }}>
        <Text weight="semibold" color={colors.primary}>Forgot password?</Text>
      </Link>
      {err ? <Notice text={err} tone="danger" /> : null}
      <Button title="Sign in" onPress={submit} loading={formState.isSubmitting} />
      <SocialButtons mode="in" />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <Text color={colors.muted}>New to Air Wallet?</Text>
        <Link href="/sign-up"><Text weight="semibold" color={colors.primary}>Create account</Text></Link>
      </View>
      {usingEmulators ? <Notice text="Local emulator · demo login: abir@demo.airwallet / Demo1234" tone="warning" /> : null}
    </Screen>
  );
}
