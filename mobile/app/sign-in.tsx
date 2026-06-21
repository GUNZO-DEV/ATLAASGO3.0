// AtlaasGo 3.0 — Account / Auth screen (sign in OR create an account on mobile).
//
// Native re-skin onto the ag3 foundation (useAg3Theme + Press/Rise + sunset
// gradients), faithful to the 3.0 look used by cart.tsx and account.tsx: cream/
// ink surfaces, terracotta #FF5722 primary, sunset-gradient brand tile, rounded
// cards via card(t), gradient primary CTA, the "Built in Ifrane 🏔" voice.
//
// CLERK AUTH PRESERVED EXACTLY — only the presentation changed:
//   Sign-up uses Clerk's email-code verification flow:
//     signUp.create → prepareEmailAddressVerification(email_code)
//     → user enters 6-digit code → attemptEmailAddressVerification → setActive.
//
//   Forgot password uses Clerk's reset-by-email-code flow:
//     signIn.create({ strategy: 'reset_password_email_code', identifier })
//     → user enters 6-digit code + new password
//     → signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code, password })
//     → setActive — signed in with the new password in one step.
//
// On a completed session (either path) the ClerkSupabaseBridge exchanges the
// Clerk token for a Supabase session, and clerk-sync provisions the
// profile/wallet/role rows — so a brand-new mobile signup is fully wired into
// the same backend as the web app.
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSignIn, useSignUp, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { KeyRound, LogIn, UserPlus, MailCheck } from 'lucide-react-native';

import { useAg3Theme, type Ag3Theme } from '../components/ag3/theme';
import { IBack, ICheck } from '../components/ag3/icons';
import { Press, Rise } from '../components/ag3/primitives';

type Mode = 'signin' | 'signup';

function clerkErr(e: unknown): string {
  return (
    (e as { errors?: { message?: string; longMessage?: string }[] })?.errors?.[0]?.longMessage ??
    (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
    (e instanceof Error ? e.message : 'Something went wrong')
  );
}

export default function AccountScreen() {
  const t = useAg3Theme();
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

  // ── 3.0 copy: title / subtitle per step ───────────────────────────────────
  const eyebrow = isSignedIn
    ? 'AtlaasGo · Account'
    : pendingReset
      ? 'AtlaasGo · Reset'
      : pendingCode
        ? 'AtlaasGo · Verify'
        : 'AtlaasGo · Account';

  const title = isSignedIn
    ? 'You’re signed in.'
    : pendingReset
      ? 'Reset your password.'
      : pendingCode
        ? 'Check your email.'
        : mode === 'signin'
          ? 'Welcome back.'
          : 'Create your account.';

  const subtitle = isSignedIn
    ? 'Your session is active — orders are linked to your account.'
    : pendingReset
      ? `We sent a 6-digit code to ${email.trim()}. Enter it below with your new password.`
      : pendingCode
        ? `We sent a 6-digit code to ${email.trim()}.`
        : mode === 'signin'
          ? 'Sign in to track orders, save addresses, and use your wallet.'
          : 'Join AtlaasGo — free delivery on your first order.';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── back ── */}
          <View style={{ paddingTop: 10 }}>
            <Press onPress={() => router.back()} scaleTo={0.9}>
              <View style={[styles.iconBtn, { backgroundColor: t.colors.surface, borderColor: t.colors.line2 }, t.shadows.card]}>
                <IBack size={20} color={t.colors.fg} />
              </View>
            </Press>
          </View>

          {/* ── brand mark in a sunset gradient tile ── */}
          <Rise>
            <View style={{ alignItems: 'center', marginTop: 22 }}>
              <LinearGradient
                colors={t.gradients.sunset}
                start={t.gradients.start}
                end={t.gradients.end}
                style={[styles.brandTile, t.shadows.glow]}
              >
                <Text style={styles.brandGlyph}>🏔</Text>
              </LinearGradient>
            </View>
          </Rise>

          {/* ── headline ── */}
          <Rise delay={60}>
            <View style={{ marginTop: 20, marginBottom: 26, alignItems: 'center' }}>
              <Text style={[styles.eyebrow, { color: t.colors.primary }]}>{eyebrow}</Text>
              <Text style={[styles.title, { color: t.colors.fg }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: t.colors.muted }]}>{subtitle}</Text>
            </View>
          </Rise>

          {isSignedIn ? (
            /* ── signed-in confirmation ─────────────────────────────────── */
            <Rise delay={120}>
              <View style={[card(t), styles.signedInCard]}>
                <View style={[styles.okDot, { backgroundColor: 'rgba(47,163,107,0.14)' }]}>
                  <ICheck size={22} color={t.colors.ok} />
                </View>
                <Press onPress={() => router.replace('/')} style={{ width: '100%', marginTop: 16 }}>
                  <LinearGradient
                    colors={t.gradients.sunset}
                    start={t.gradients.start}
                    end={t.gradients.end}
                    style={[styles.primaryBtn, t.shadows.glow]}
                  >
                    <Text style={styles.primaryTxt}>Start ordering</Text>
                  </LinearGradient>
                </Press>
              </View>
            </Rise>
          ) : pendingReset ? (
            /* ── Password reset step ──────────────────────────────────────── */
            <Rise delay={120}>
              <View style={[card(t), styles.formCard]}>
                <Field t={t} label="Verification code">
                  <TextInput
                    value={resetCode}
                    onChangeText={setResetCode}
                    keyboardType="number-pad"
                    placeholder="123456"
                    maxLength={6}
                    placeholderTextColor={t.colors.muted}
                    style={inputStyle(t)}
                  />
                </Field>
                <Field t={t} label="New password">
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    placeholderTextColor={t.colors.muted}
                    style={inputStyle(t)}
                  />
                </Field>

                <PrimaryButton t={t} busy={busy} onPress={handleResetPassword} icon={KeyRound} label="Reset & sign in" />

                <Pressable onPress={resendResetCode} style={{ marginTop: 16 }}>
                  <Text style={[styles.linkCenter, { color: t.colors.primary }]}>Resend code</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setPendingReset(false); setResetCode(''); setNewPassword(''); }}
                  style={{ marginTop: 12 }}
                >
                  <Text style={[styles.mutedCenter, { color: t.colors.muted }]}>Back to sign in</Text>
                </Pressable>
              </View>
            </Rise>
          ) : pendingCode ? (
            /* ── Email verification step ──────────────────────────────────── */
            <Rise delay={120}>
              <View style={[card(t), styles.formCard]}>
                <Field t={t} label="Verification code">
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    placeholder="123456"
                    maxLength={6}
                    placeholderTextColor={t.colors.muted}
                    style={inputStyle(t)}
                  />
                </Field>

                <PrimaryButton t={t} busy={busy} onPress={handleVerifyCode} icon={MailCheck} label="Verify & continue" />

                <Pressable onPress={resendCode} style={{ marginTop: 16 }}>
                  <Text style={[styles.linkCenter, { color: t.colors.primary }]}>Resend code</Text>
                </Pressable>
                <Pressable onPress={() => { setPendingCode(false); setCode(''); }} style={{ marginTop: 12 }}>
                  <Text style={[styles.mutedCenter, { color: t.colors.muted }]}>Use a different email</Text>
                </Pressable>
              </View>
            </Rise>
          ) : (
            /* ── Sign in / Sign up form ───────────────────────────────────── */
            <Rise delay={120}>
              <View style={[card(t), styles.formCard]}>
                {/* Segmented toggle */}
                <View style={[styles.seg, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
                  {(['signin', 'signup'] as Mode[]).map((m) => {
                    const active = mode === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => setMode(m)}
                        style={[styles.segBtn, active && [{ backgroundColor: t.colors.surface }, t.shadows.card]]}
                      >
                        <Text
                          style={{
                            fontSize: 13.5,
                            fontWeight: active ? '800' : '600',
                            color: active ? t.colors.fg : t.colors.muted,
                          }}
                        >
                          {m === 'signin' ? 'Sign in' : 'Create account'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Field t={t} label="Email">
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="you@aui.ma"
                    placeholderTextColor={t.colors.muted}
                    style={inputStyle(t)}
                  />
                </Field>

                {mode === 'signup' && (
                  <Field t={t} label="Username">
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoComplete="username-new"
                      placeholder="atlas_eater"
                      placeholderTextColor={t.colors.muted}
                      style={inputStyle(t)}
                    />
                  </Field>
                )}

                <Field t={t} label="Password">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    placeholder={mode === 'signin' ? '••••••••' : 'At least 8 characters'}
                    placeholderTextColor={t.colors.muted}
                    style={inputStyle(t)}
                  />
                </Field>

                {mode === 'signin' && (
                  <Pressable onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginTop: 2, marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: t.colors.primary }}>Forgot password?</Text>
                  </Pressable>
                )}

                <View style={{ marginTop: mode === 'signin' ? 4 : 8 }}>
                  <PrimaryButton
                    t={t}
                    busy={busy}
                    onPress={mode === 'signin' ? handleSignIn : handleSignUp}
                    icon={mode === 'signin' ? LogIn : UserPlus}
                    label={mode === 'signin' ? 'Sign in' : 'Create account'}
                  />
                </View>

                <Text style={[styles.fine, { color: t.colors.muted }]}>
                  {mode === 'signin'
                    ? 'New to AtlaasGo? Tap “Create account” above.'
                    : 'By creating an account you agree to our Terms & Privacy Policy.'}
                </Text>
              </View>
            </Rise>
          )}

          {/* ── Built in Ifrane voice ── */}
          <Text style={[styles.ifrane, { color: t.colors.muted }]}>Built in Ifrane 🏔</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── sub-components ───────────────────────────────────────────────────────── */

function Field({ t, label, children }: { t: Ag3Theme; label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.fieldLabel, { color: t.colors.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

function PrimaryButton({
  t,
  busy,
  onPress,
  icon: Icon,
  label,
}: {
  t: Ag3Theme;
  busy: boolean;
  onPress: () => void;
  icon: typeof LogIn;
  label: string;
}) {
  return (
    <Press onPress={onPress} disabled={busy}>
      <LinearGradient
        colors={t.gradients.sunset}
        start={t.gradients.start}
        end={t.gradients.end}
        style={[styles.primaryBtn, t.shadows.glow, { opacity: busy ? 0.65 : 1 }]}
      >
        {busy ? (
          <ActivityIndicator color={t.colors.onPrimary} />
        ) : (
          <>
            <Icon size={17} color={t.colors.onPrimary} />
            <Text style={styles.primaryTxt}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Press>
  );
}

/* ── shared card base ─────────────────────────────────────────────────────── */
function card(t: Ag3Theme) {
  return {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.line2,
    ...t.shadows.card,
  } as const;
}

function inputStyle(t: Ag3Theme) {
  return {
    backgroundColor: t.colors.surface2,
    borderColor: t.colors.line,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: t.colors.fg,
    marginTop: 6,
  } as const;
}

/* ── styles ───────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  iconBtn: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  brandTile: { width: 78, height: 78, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  brandGlyph: { fontSize: 40, lineHeight: 46 },

  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 },
  title: { fontWeight: '800', letterSpacing: -0.8, fontSize: 30, textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 320 },

  formCard: { padding: 18 },
  signedInCard: { padding: 22, alignItems: 'center' },
  okDot: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },

  seg: { flexDirection: 'row', gap: 4, borderRadius: 16, borderWidth: 1, padding: 4, marginBottom: 18 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },

  fieldLabel: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: '700' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, paddingVertical: 16, paddingHorizontal: 22 },
  primaryTxt: { color: '#fff', fontWeight: '800', fontSize: 15.5 },

  linkCenter: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  mutedCenter: { fontSize: 12.5, textAlign: 'center' },
  fine: { marginTop: 16, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  ifrane: { marginTop: 26, fontSize: 12.5, fontWeight: '600', textAlign: 'center', letterSpacing: 0.2 },
});
