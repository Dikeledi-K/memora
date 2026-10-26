import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, ErrorText, Field, Screen, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { isConfigured, supabase } from '@/lib/supabase';

export default function SignIn() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit() {
    setError('');
    setNotice('');
    if (!email.trim() || password.length < 6) {
      setError('Enter your email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    const credentials = { email: email.trim(), password };
    const { data, error } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setBusy(false);
    if (error) setError(error.message);
    else if (mode === 'sign-up' && !data.session) setNotice('Check your email to confirm your account, then sign in.');
  }

  return (
    <Screen>
      <View style={{ gap: Spacing.two, marginTop: Spacing.six }}>
        <Title>Memora</Title>
        <Body muted>Turn your notes into flashcards and remember them for exam day.</Body>
      </View>

      {!isConfigured && (
        <ErrorText>
          Supabase is not configured. Copy .env.example to .env and add your project URL and anon key.
        </ErrorText>
      )}

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
        placeholder="At least 6 characters"
        onSubmitEditing={submit}
      />
      <ErrorText>{error}</ErrorText>
      {notice ? <Body>{notice}</Body> : null}

      <Button title={mode === 'sign-in' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} />
      <Button
        variant="ghost"
        title={mode === 'sign-in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
      />
    </Screen>
  );
}
