import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSignIn, useSignUp, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { ArrowLeft, KeyRound, LogIn, UserPlus, MailCheck } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';

/**
 * Full account screen — sign in OR create an account, entirely on mobile.
 *
 * Sign-up uses Clerk's email-code verification flow:
 *   signUp.create → prepareEmailAddressVerification(email_code)
 *   → user enters 6-digit code → attemptEmailAddressVerification → setActive.
 *
 * Forgot password uses Clerk's reset-by-email-code flow:
 *   signIn.create({ strategy: 'reset_password_email_code', identifier })
 *   → user enters 6-digit code + new password
 *   → signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code, password })
 *   → setActive — signed in with the new password in one step.
 *
 * On a completed session (either path) the ClerkSupabaseBridge exchanges the
 * Clerk token for a Supabase session, and clerk-sync provisions the
 * profile/wallet/role rows — so a brand-new mobile signup is fully wired into
 * the same backend as the web app.
 */
type Mode = 'signin' | 'signup';

const BRAND = '#FF5722';
const INK = '#1A1410';
const MUTED = '#7A6F66';

function clerkErr(e: unknown): string {
  return (
    (e as { errors?: { message?: string; longMessage?: string }[] })?.errors?.[0]?.longMessage ??
    (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
    (e instanceof Error ? e.message : 'Something went wrong')
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { isSignedIn } = useClerkAuth();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // Sign-up email-verification sub-state
  const [pendingCode, setPendingCode] = useState(false);
  const [code, setCode] = useState('');

  // Forgot-password sub-state (mirrors the sign-up verification pattern)
  const [pendingReset, setPendingReset] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  async function handleSignIn() {
    if (!signInLoaded || busy) return;
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password });
      if (attempt.status === 'complete') {
        await setSignInActive({ session: attempt.createdSessionId });
        router.replace('/');
      } else {
        Alert.alert('Almost there', 'Additional verification is required for this account.');
      }
    } catch (e) {
      Alert.alert('Sign in failed', clerkErr(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    if (!signUpLoaded || busy) return;
    if (!email.trim() || password.length < 8) {
      Alert.alert('Check your details', 'Enter a valid email and a password of at least 8 characters.');
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert('Pick a username', 'Choose a username of at least 3 characters.');
      return;
    }
    setBusy(true);
    try {
      // Clerk requires email + username for this instance.
      await signUp.create({
        emailAddress: email.trim(),
        username: username.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingCode(true);
    } catch (e) {
      Alert.alert('Could not create account', clerkErr(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode() {
    if (!signUpLoaded || busy) return;
    if (code.trim().length < 6) {
      Alert.alert('Enter the code', 'Type the 6-digit code we emailed you.');
      return;
    }
    setBusy(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (attempt.status === 'complete') {
        await setSignUpActive({ session: attempt.createdSessionId });
        router.replace('/');
      } else {
        Alert.alert('Almost there', 'Verification incomplete — please try again.');
      }
    } catch (e) {
      Alert.alert('Verification failed', clerkErr(e));
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (!signUpLoaded) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      Alert.alert('Code sent', 'We emailed you a fresh code.');
    } catch (e) {
      Alert.alert('Could not resend', clerkErr(e));
    }
  }

  async function handleForgotPassword() {
    if (!signInLoaded || busy) return;
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your account email above, then tap “Forgot password?” again.');
      return;
    }
    setBusy(true);
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() });
      setResetCode('');
      setNewPassword('');
      setPendingReset(true);
    } catch (e) {
      Alert.alert('Could not start reset', clerkErr(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    if (!signInLoaded || busy) return;
    if (resetCode.trim().length < 6) {
      Alert.alert('Enter the code', 'Type the 6-digit code we emailed you.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Pick a stronger password', 'Your new password needs at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode.trim(),
        password: newPassword,
      });
      if (attempt.status === 'complete') {
        await setSignInActive({ session: attempt.createdSessionId });
        router.replace('/');
      } else {
        Alert.alert('Almost there', 'Additional verification is required — try signing in again.');
      }
    } catch (e) {
      Alert.alert('Reset failed', clerkErr(e));
    } finally {
      setBusy(false);
    }
  }

  async function resendResetCode() {
    if (!signInLoaded) return;
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() });
      Alert.alert('Code sent', 'We emailed you a fresh reset code.');
    } catch (e) {
      Alert.alert('Could not resend', clerkErr(e));
    }
  }

  const label = (t: string) => (
    <Text className="text-[11px] uppercase font-bold mb-1.5" style={{ letterSpacing: 0.6, color: MUTED }}>
      {t}
    </Text>
  );

  const input = {
    className: 'bg-white rounded-2xl px-4 py-3.5 text-[15px] mb-4',
    style: { borderWidth: 1, borderColor: 'rgba(26,20,16,0.10)', color: INK },
    placeholderTextColor: '#A89E94',
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="pt-3">
            <PressableScale onPress={() => router.back()}>
              <View
                className="w-10 h-10 rounded-full items-center justify-center bg-white"
                style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
              >
                <ArrowLeft size={18} color={INK} />
              </View>
            </PressableScale>
          </View>

          <View className="mt-8 mb-7">
            <Text className="text-[12px] uppercase font-bold mb-2" style={{ letterSpacing: 1.6, color: BRAND }}>
              AtlaasGo · Account
            </Text>
            <Text className="font-display text-[32px]" style={{ fontWeight: '800', letterSpacing: -1, color: INK }}>
              {isSignedIn
                ? 'You’re signed in.'
                : pendingReset
                  ? 'Reset your password.'
                  : pendingCode
                    ? 'Check your email.'
                    : mode === 'signin'
                      ? 'Welcome back.'
                      : 'Create your account.'}
            </Text>
            <Text className="mt-2 text-[14px]" style={{ color: MUTED, lineHeight: 20 }}>
              {isSignedIn
                ? 'Your session is active — orders are linked to your account.'
                : pendingReset
                  ? `We sent a 6-digit code to ${email.trim()}. Enter it below with your new password.`
                  : pendingCode
                    ? `We sent a 6-digit code to ${email.trim()}.`
                    : mode === 'signin'
                      ? 'Sign in to track orders, save addresses, and use your wallet.'
                      : 'Join AtlaasGo — free delivery on your first order.'}
            </Text>
          </View>

          {isSignedIn ? null : pendingReset ? (
            /* ── Password reset step ─────────────────────────────────── */
            <>
              {label('Verification code')}
              <TextInput
                value={resetCode}
                onChangeText={setResetCode}
                keyboardType="number-pad"
                placeholder="123456"
                maxLength={6}
                {...input}
              />
              {label('New password')}
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoComplete="new-password"
                placeholder="At least 8 characters"
                {...input}
              />
              <Pressable
                onPress={handleResetPassword}
                disabled={busy}
                className="rounded-2xl py-4 flex-row items-center justify-center"
                style={{ backgroundColor: BRAND, opacity: busy ? 0.6 : 1 }}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <KeyRound size={16} color="#fff" />
                    <Text className="text-white font-bold text-[15px] ml-2">Reset & sign in</Text>
                  </>
                )}
              </Pressable>
              <Pressable onPress={resendResetCode} className="mt-4">
                <Text className="text-[13px] text-center font-bold" style={{ color: BRAND }}>
                  Resend code
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setPendingReset(false); setResetCode(''); setNewPassword(''); }}
                className="mt-3"
              >
                <Text className="text-[12px] text-center" style={{ color: MUTED }}>
                  Back to sign in
                </Text>
              </Pressable>
            </>
          ) : pendingCode ? (
            /* ── Email verification step ─────────────────────────────── */
            <>
              {label('Verification code')}
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="123456"
                maxLength={6}
                {...input}
              />
              <Pressable
                onPress={handleVerifyCode}
                disabled={busy}
                className="rounded-2xl py-4 flex-row items-center justify-center"
                style={{ backgroundColor: BRAND, opacity: busy ? 0.6 : 1 }}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MailCheck size={16} color="#fff" />
                    <Text className="text-white font-bold text-[15px] ml-2">Verify & continue</Text>
                  </>
                )}
              </Pressable>
              <Pressable onPress={resendCode} className="mt-4">
                <Text className="text-[13px] text-center font-bold" style={{ color: BRAND }}>
                  Resend code
                </Text>
              </Pressable>
              <Pressable onPress={() => { setPendingCode(false); setCode(''); }} className="mt-3">
                <Text className="text-[12px] text-center" style={{ color: MUTED }}>
                  Use a different email
                </Text>
              </Pressable>
            </>
          ) : (
            /* ── Sign in / Sign up form ──────────────────────────────── */
            <>
              {/* Segmented toggle */}
              <View
                className="flex-row p-1 rounded-2xl mb-6"
                style={{ backgroundColor: 'rgba(26,20,16,0.05)' }}
              >
                {(['signin', 'signup'] as Mode[]).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setMode(m)}
                    className="flex-1 py-2.5 rounded-xl items-center"
                    style={{ backgroundColor: mode === m ? '#fff' : 'transparent' }}
                  >
                    <Text
                      className="text-[14px] font-bold"
                      style={{ color: mode === m ? INK : MUTED }}
                    >
                      {m === 'signin' ? 'Sign in' : 'Create account'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {label('Email')}
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@aui.ma"
                {...input}
              />
              {mode === 'signup' && (
                <>
                  {label('Username')}
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoComplete="username-new"
                    placeholder="atlas_eater"
                    {...input}
                  />
                </>
              )}
              {label('Password')}
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder={mode === 'signin' ? '••••••••' : 'At least 8 characters'}
                {...input}
              />

              {mode === 'signin' && (
                <Pressable onPress={handleForgotPassword} className="self-end -mt-2 mb-2">
                  <Text className="text-[13px] font-bold" style={{ color: BRAND }}>
                    Forgot password?
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={mode === 'signin' ? handleSignIn : handleSignUp}
                disabled={busy}
                className="rounded-2xl py-4 flex-row items-center justify-center mt-2"
                style={{ backgroundColor: BRAND, opacity: busy ? 0.6 : 1 }}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : mode === 'signin' ? (
                  <>
                    <LogIn size={16} color="#fff" />
                    <Text className="text-white font-bold text-[15px] ml-2">Sign in</Text>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} color="#fff" />
                    <Text className="text-white font-bold text-[15px] ml-2">Create account</Text>
                  </>
                )}
              </Pressable>

              <Text className="mt-4 text-[12px] text-center" style={{ color: MUTED, lineHeight: 18 }}>
                {mode === 'signin'
                  ? 'New to AtlaasGo? Tap “Create account” above.'
                  : 'By creating an account you agree to our Terms & Privacy Policy.'}
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
