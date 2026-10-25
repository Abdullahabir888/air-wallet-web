import { useState } from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { signUpSchema, type SignUpValues } from '@air-wallet/validation';
import { auth } from '@/lib/firebase';
import { api, errorMessage } from '@/lib/api';
import { Button, Field, Notice, Screen, Text, Header } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { SocialButtons } from '@/components/SocialButtons';

export default function SignUp() {
  const { colors } = useTheme();
  const [err, setErr] = useState('');
  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', phone: '', password: '', confirm: '' },
  });

  const submit = handleSubmit(async (raw) => {
    setErr('');
    const v = signUpSchema.parse(raw);
    try {
      const cred = await createUserWithEmailAndPassword(auth, v.email.trim(), v.password);
      await updateProfile(cred.user, { displayName: v.displayName });
      await sendEmailVerification(cred.user);
      // Phone is claimed server-side so two accounts can't share a number.
      await api.registerPhone({ phone: v.phone, displayName: v.displayName }).catch((e) => setErr(errorMessage(e)));
    } catch (e) {
      setErr(errorMessage(e));
    }
  });

  const f = (name: keyof SignUpValues, label: string, props: object = {}) => (
    <Controller control={control} name={name} render={({ field, fieldState }) => (
      <Field label={label} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} {...props} />
    )} />
  );

  return (
    <Screen>
      <Header title="Create account" />
      <Text color={colors.muted}>Your wallet starts in BDT. Add USD, GBP or EUR any time.</Text>
      {f('displayName', 'Full name', { autoComplete: 'name', textContentType: 'name' })}
      {f('email', 'Email', { autoCapitalize: 'none', keyboardType: 'email-address', autoComplete: 'email' })}
      {f('phone', 'Mobile number', { keyboardType: 'phone-pad', placeholder: '01XXXXXXXXX', autoComplete: 'tel' })}
      {f('password', 'Password', { secureTextEntry: true, autoComplete: 'new-password', textContentType: 'newPassword' })}
      {f('confirm', 'Confirm password', { secureTextEntry: true, autoComplete: 'new-password' })}
      <Text size={12} color={colors.muted}>8+ characters with upper, lower case and a number.</Text>
      {err ? <Notice text={err} tone="danger" /> : null}
      <Button title="Create account" onPress={submit} loading={formState.isSubmitting} />
      <SocialButtons mode="up" />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        <Text color={colors.muted}>Already have an account?</Text>
        <Link href="/sign-in"><Text weight="semibold" color={colors.primary}>Sign in</Text></Link>
      </View>
    </Screen>
  );
}
