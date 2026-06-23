// AtlaasDriver — login / sign-in.
// Native re-skin of driver/screen-login.jsx from the live Claude Design project,
// onto the dr/ui light + sunset-orange foundation (BG/CARD/EMERALD = #FF5722).
//
// AUTH — same Clerk instance + flows as the customer app, kept intact:
//   - email + password sign-in  → setActive → '/'
//   - email-code sign-up (username + 8+ pw) → verify code → setActive → '/'
//   - reset-by-email-code → new password → setActive → '/'
//   - GOOGLE via Clerk SSO (useSSO().startSSOFlow, redirectUrl =
//     createURL('/sso-callback')) with the 3-branch handling
//     (createdSessionId / signIn transferable / signUp transferable), mirroring
//     the customer login. Apple stays a "coming soon" placeholder.
// The ClerkSupabaseBridge then exchanges the session for Supabase; useRoles
// gates the dashboard to approved riders.
//
// CONFIG FOLLOWUP (not a code blocker): the driver app scheme is
// 'atlaasgodriver', so the Google redirect resolves to
// atlaasgodriver://sso-callback — that URI must be added to the Clerk redirect
// allowlist for the production instance, alongside the customer atlaasgo:// one.
import { useEffect, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createURL } from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path, G } from 'react-native-svg';
import { useSignIn, useSignUp, useSSO } from '@clerk/clerk-expo';
import {
  ArrowLeft,
  ChevronRight,
  Coins,
  ShieldCheck,
  Snowflake,
  Apple,
  Check,
} from 'lucide-react-native';
import {
  BG,
  CARD,
  LINE,
  SURFACE2,
  EMERALD,
  GLOW,
  CREAM,
  MUTED,
  ONLINE,
  GRAD,
  R,
  SHADOW_2,
} from '../components/dr/ui';

// Completes any pending OAuth/SSO web-browser session on app focus (required for
// the redirect-based Clerk Google flow to settle on native).
WebBrowser.maybeCompleteAuthSession();

const PLACEHOLDER = '#A99C8E'; // muted warm placeholder on light inputs
type Mode = 'signin' | 'signup';

function clerkErr(e: unknown): string {
  return (
    (e as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ??
    (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
    (e instanceof Error ? e.message : 'Something went wrong')
  );
}

// Atlas-mountain navigation arrow mark (matches the driver app icon glyph).
function ArrowMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G transform="rotate(14 24 23)">
        <Path d="M24 8 L17 36 L24 31 Z" fill="#fff" />
        <Path d="M24 8 L31 36 L24 31 Z" fill="#fff" fillOpacity={0.78} />
      </G>
    </Svg>
  );
}

export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingCode, setPendingCode] = useState(false);
  const [code, setCode] = useState('');
  const [pendingReset, setPendingReset] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [done, setDone] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  // Lift the form above the on-screen keyboard. On Android the window resizes
  // when the keyboard opens, so scrolling the hero up brings the inputs + the
  // primary button fully into view instead of leaving them under the keyboard.
  const revealForm = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  function succeed() {
    setDone(true);
    setTimeout(() => router.replace('/'), 1500);
  }

  function comingSoon() {
    Alert.alert('Coming soon', 'Apple sign-in lands in the next release. Use email or Google for now.');
  }

  async function handleSignIn() {
    if (!signInLoaded || busy) return;
    if (!email.trim() || !password) return Alert.alert('Missing details', 'Enter your email and password.');
    setBusy(true);
    try {
      const a = await signIn.create({ identifier: email.trim(), password });
      if (a.status === 'complete') {
        await setSignInActive({ session: a.createdSessionId });
        succeed();
      } else Alert.alert('Almost there', 'Additional verification is required for this account.');
    } catch (e) {
      Alert.alert('Sign in failed', clerkErr(e));
    } finally {
      setBusy(false);
    }
  }
  async function handleSignUp() {
    if (!signUpLoaded || busy) return;
    if (!email.trim() || password.length < 8) return Alert.alert('Check your details', 'Valid email and an 8+ char password.');
    if (username.trim().length < 3) return Alert.alert('Pick a username', 'At least 3 characters.');
    setBusy(true);
    try {
      await signUp.create({ emailAddress: email.trim(), username: username.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingCode(true);
    } catch (e) {
      Alert.alert('Could not create account', clerkErr(e));
    } finally {
      setBusy(false);
    }
  }
  async function handleVerify() {
    if (!signUpLoaded || busy) return;
    if (code.trim().length < 6) return Alert.alert('Enter the code', 'Type the 6-digit code we emailed you.');
    setBusy(true);
    try {
      const a = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (a.status === 'complete') {
        await setSignUpActive({ session: a.createdSessionId });
        succeed();
      } else Alert.alert('Almost there', 'Verification incomplete — try again.');
    } catch (e) {
      Alert.alert('Verification failed', clerkErr(e));
    } finally {
      setBusy(false);
    }
  }
  async function handleForgot() {
    if (!signInLoaded || busy) return;
    if (!email.trim()) return Alert.alert('Enter your email', 'Type your account email above, then tap “Forgot password?” again.');
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
  async function handleReset() {
    if (!signInLoaded || busy) return;
    if (resetCode.trim().length < 6) return Alert.alert('Enter the code', 'Type the 6-digit code we emailed you.');
    if (newPassword.length < 8) return Alert.alert('Stronger password', 'At least 8 characters.');
    setBusy(true);
    try {
      const a = await signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code: resetCode.trim(), password: newPassword });
      if (a.status === 'complete') {
        await setSignInActive({ session: a.createdSessionId });
        succeed();
      } else Alert.alert('Almost there', 'Additional verification is required — try signing in again.');
    } catch (e) {
      Alert.alert('Reset failed', clerkErr(e));
    } finally {
      setBusy(false);
    }
  }

  // ── Google OAuth via Clerk SSO ──
  // NOTE: clerk.atlaasgo.com is a *production* Clerk instance, so Google needs
  // custom Google-Cloud OAuth credentials in Clerk AND the redirect URI
  // https://clerk.atlaasgo.com/v1/oauth_callback whitelisted in Google Cloud.
  // The driver scheme is 'atlaasgodriver' → atlaasgodriver://sso-callback must
  // also be on the Clerk redirect allowlist (config followup, not a blocker).
  async function startGoogle() {
    if (busy) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive, signIn: ssoSignIn, signUp: ssoSignUp } = await startSSOFlow({
        strategy: 'oauth_google',
        // Explicit callback path — on a standalone (production) Android build a
        // bare "/" redirect can be swallowed by the router before Clerk reads it.
        redirectUrl: createURL('/sso-callback'),
      });

      // Happy path — Clerk minted a session straight away.
      if (createdSessionId) {
        await setActive?.({ session: createdSessionId });
        succeed();
        return;
      }

      // First-time Google user whose email already exists (e.g. they signed up
      // with email + password before): transfer the Google identity onto it.
      if (ssoSignIn?.firstFactorVerification?.status === 'transferable') {
        const res = await ssoSignIn.create({ transfer: true });
        if (res.createdSessionId) {
          await setActive?.({ session: res.createdSessionId });
          succeed();
          return;
        }
      }
      if (ssoSignUp?.verifications?.externalAccount?.status === 'transferable') {
        const res = await ssoSignUp.create({ transfer: true });
        if (res.createdSessionId) {
          await setActive?.({ session: res.createdSessionId });
          succeed();
          return;
        }
      }
      // Got here with no session and no throw → the user dismissed the Google
      // sheet. Real credential/redirect errors are surfaced by the catch below.
    } catch (e) {
      Alert.alert('Google sign-in failed', clerkErr(e));
    } finally {
      setBusy(false);
    }
  }

  // ── Success overlay ──
  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <View style={{ width: 96, height: 96, borderRadius: 999, backgroundColor: ONLINE, alignItems: 'center', justifyContent: 'center' }}>
          <Check size={46} color="#fff" strokeWidth={3} />
        </View>
        <Text style={[styles.h, { color: CREAM, marginTop: 26 }]}>You’re in 👋</Text>
        <Text style={[styles.sub, { color: MUTED, textAlign: 'center', maxWidth: 260 }]}>
          Opening your dashboard — go online to start earning the snow boost.
        </Text>
      </View>
    );
  }

  const title = pendingReset
    ? 'Reset password.'
    : pendingCode
    ? 'Check your email.'
    : mode === 'signin'
    ? 'Welcome back, rider.'
    : 'Become a rider.';
  const subtitle = pendingReset
    ? `Enter the code we sent to ${email.trim()} and a new password.`
    : pendingCode
    ? `We sent a 6-digit code to ${email.trim()}.`
    : mode === 'signin'
    ? 'Sign in to go online and accept deliveries.'
    : 'Create an account, then apply to drive in the customer app.';

  const onBack = () => {
    if (pendingReset) {
      setPendingReset(false);
      setResetCode('');
      setNewPassword('');
    } else if (pendingCode) {
      setPendingCode(false);
      setCode('');
    } else {
      router.back();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        >
          {/* ── HERO ── */}
          <LinearGradient
            colors={[EMERALD, EMERALD, GLOW]}
            locations={[0, 0.42, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ paddingTop: insets.top + 22, paddingHorizontal: 28, paddingBottom: 52 }}
          >
            <View style={styles.mark}>
              <ArrowMark size={32} />
            </View>
            <Text style={styles.word}>
              Atlaas<Text style={{ fontWeight: '900' }}>Driver</Text>
            </Text>
            <Text style={styles.tag}>Deliver across Ifrane & the Atlas region.</Text>
            <View style={styles.chips}>
              <View style={styles.chip}>
                <Coins size={13} color="#fff" />
                <Text style={styles.chipTxt}>60–90 dh / hour</Text>
              </View>
              <View style={styles.chip}>
                <ShieldCheck size={13} color="#fff" />
                <Text style={styles.chipTxt}>Daily payouts</Text>
              </View>
              <View style={styles.chip}>
                <Snowflake size={13} color="#fff" />
                <Text style={styles.chipTxt}>Snow boost +30%</Text>
              </View>
            </View>
            {/* mountain ridge cutting into the sheet */}
            <Svg width="100%" height={46} viewBox="0 0 420 60" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: -1 }}>
              <Path d="M0 60 L0 40 L70 14 L130 38 L210 8 L300 36 L360 16 L420 42 L420 60 Z" fill={BG} />
            </Svg>
          </LinearGradient>

          {/* ── SHEET ── */}
          <View style={[styles.sheet, { backgroundColor: BG }]}>
            <View style={[styles.grip, { backgroundColor: LINE }]} />

            {/* Back affordance — leaves a sub-step or returns to the entry hero */}
            <Pressable onPress={onBack} style={[styles.back, { backgroundColor: CARD, borderColor: LINE }]}>
              <ArrowLeft size={20} color={CREAM} />
            </Pressable>

            <Text style={[styles.h, { color: CREAM }]}>{title}</Text>
            <Text style={[styles.sub, { color: MUTED }]}>{subtitle}</Text>

            {pendingReset ? (
              <>
                {label('Verification code')}
                <View style={[styles.field, { backgroundColor: CARD, borderColor: LINE }]}>
                  <TextInput
                    value={resetCode}
                    onChangeText={setResetCode}
                    keyboardType="number-pad"
                    placeholder="123456"
                    placeholderTextColor={PLACEHOLDER}
                    maxLength={6}
                    onFocus={revealForm}
                    style={[styles.input, { color: CREAM }]}
                  />
                </View>
                {label('New password')}
                <View style={[styles.field, { backgroundColor: CARD, borderColor: LINE }]}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholder="At least 8 characters"
                    placeholderTextColor={PLACEHOLDER}
                    onFocus={revealForm}
                    onSubmitEditing={handleReset}
                    style={[styles.input, { color: CREAM }]}
                  />
                </View>
                <PrimaryBtn text="Reset & sign in" onPress={handleReset} busy={busy} />
              </>
            ) : pendingCode ? (
              <>
                {label('Verification code')}
                <View style={[styles.field, { backgroundColor: CARD, borderColor: LINE }]}>
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    placeholder="123456"
                    placeholderTextColor={PLACEHOLDER}
                    maxLength={6}
                    onFocus={revealForm}
                    onSubmitEditing={handleVerify}
                    style={[styles.input, { color: CREAM }]}
                  />
                </View>
                <PrimaryBtn text="Verify & continue" onPress={handleVerify} busy={busy} />
              </>
            ) : (
              <>
                {/* sign in / create account toggle */}
                <View style={[styles.seg, { backgroundColor: SURFACE2, borderColor: LINE }]}>
                  {(['signin', 'signup'] as Mode[]).map((m) => {
                    const active = mode === m;
                    return (
                      <Pressable key={m} onPress={() => setMode(m)} style={[styles.segBtn, active && { backgroundColor: EMERALD }]}>
                        <Text style={{ fontSize: 13.5, fontWeight: active ? '800' : '600', color: active ? '#fff' : MUTED }}>
                          {m === 'signin' ? 'Sign in' : 'Create account'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {label('Email')}
                <View style={[styles.field, { backgroundColor: CARD, borderColor: LINE }]}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="you@aui.ma"
                    placeholderTextColor={PLACEHOLDER}
                    onFocus={revealForm}
                    style={[styles.input, { color: CREAM }]}
                  />
                </View>

                {mode === 'signup' && (
                  <>
                    {label('Username')}
                    <View style={[styles.field, { backgroundColor: CARD, borderColor: LINE }]}>
                      <TextInput
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        placeholder="atlas_rider"
                        placeholderTextColor={PLACEHOLDER}
                        onFocus={revealForm}
                        style={[styles.input, { color: CREAM }]}
                      />
                    </View>
                  </>
                )}

                {label('Password')}
                <View style={[styles.field, { backgroundColor: CARD, borderColor: LINE }]}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder={mode === 'signin' ? '••••••••' : 'At least 8 characters'}
                    placeholderTextColor={PLACEHOLDER}
                    onFocus={revealForm}
                    onSubmitEditing={mode === 'signin' ? handleSignIn : handleSignUp}
                    style={[styles.input, { color: CREAM }]}
                  />
                </View>

                {mode === 'signin' && (
                  <Pressable onPress={handleForgot} style={{ alignSelf: 'flex-end', marginTop: 4 }} hitSlop={8}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: EMERALD }}>Forgot password?</Text>
                  </Pressable>
                )}

                <PrimaryBtn
                  text={mode === 'signin' ? 'Sign in' : 'Create account'}
                  onPress={mode === 'signin' ? handleSignIn : handleSignUp}
                  busy={busy}
                  chevron
                />

                {/* divider + social */}
                <View style={styles.orRow}>
                  <View style={[styles.orLine, { backgroundColor: LINE }]} />
                  <Text style={{ color: MUTED, fontSize: 11.5, fontWeight: '600' }}>or continue with</Text>
                  <View style={[styles.orLine, { backgroundColor: LINE }]} />
                </View>
                <Pressable onPress={comingSoon} style={[styles.alt, { backgroundColor: CARD, borderColor: LINE }]}>
                  <Apple size={17} color={CREAM} fill={CREAM} />
                  <Text style={[styles.altTxt, { color: CREAM }]}>Sign in with Apple</Text>
                </Pressable>
                <Pressable
                  onPress={() => void startGoogle()}
                  disabled={busy}
                  style={[styles.alt, { backgroundColor: CARD, borderColor: LINE, marginTop: 10, opacity: busy ? 0.55 : 1 }]}
                >
                  <Svg width={18} height={18} viewBox="0 0 18 18">
                    <Path
                      fill={EMERALD}
                      d="M9 7.4v3.4h4.8c-.2 1.2-1.5 3.6-4.8 3.6A5.4 5.4 0 1 1 12.5 5l2.4-2.3A8.7 8.7 0 1 0 9 17.7c5 0 8.4-3.6 8.4-8.6 0-.6 0-1-.1-1.7H9Z"
                    />
                  </Svg>
                  <Text style={[styles.altTxt, { color: CREAM }]}>Sign in with Google</Text>
                </Pressable>

                <Text style={[styles.terms, { color: MUTED }]}>
                  By continuing you agree to our Courier Terms & Privacy Policy.
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Uppercase field label (matches the design's .lg-label).
function label(t: string) {
  return <Text style={styles.label}>{t}</Text>;
}

// Primary gradient CTA — sunset glow, optional trailing chevron.
function PrimaryBtn({
  text,
  onPress,
  busy,
  chevron,
}: {
  text: string;
  onPress: () => void;
  busy: boolean;
  chevron?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={busy}>
      <LinearGradient colors={GRAD.colors} start={GRAD.start} end={GRAD.end} style={[styles.cta, styles.glow, { opacity: busy ? 0.55 : 1 }]}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.ctaTxt}>{text}</Text>
            {chevron ? <ChevronRight size={19} color="#fff" /> : null}
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // hero
  mark: { width: 64, height: 64, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)', alignItems: 'center', justifyContent: 'center' },
  word: { fontWeight: '900', fontSize: 31, letterSpacing: -1.1, color: '#fff', marginTop: 20 },
  tag: { fontSize: 14, color: 'rgba(255,255,255,0.95)', marginTop: 8, fontWeight: '500', maxWidth: 290, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)' },
  chipTxt: { fontSize: 11.5, fontWeight: '600', color: '#fff' },

  // sheet
  sheet: { marginTop: -34, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, paddingHorizontal: 26, paddingTop: 14, paddingBottom: 40, flex: 1, ...SHADOW_2 },
  grip: { width: 42, height: 5, borderRadius: 999, alignSelf: 'center', marginBottom: 16 },
  back: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 18 },
  h: { fontWeight: '800', fontSize: 24, letterSpacing: -0.6 },
  sub: { fontSize: 13.5, marginTop: 5, lineHeight: 20 },

  seg: { flexDirection: 'row', gap: 4, borderRadius: 14, borderWidth: 1, padding: 4, marginTop: 18 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 11 },

  label: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '700', marginTop: 18, marginBottom: 9, color: MUTED },
  field: { borderWidth: 1.5, borderRadius: 15, overflow: 'hidden' },
  input: { paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, fontWeight: '600' },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22, height: 54, borderRadius: 15 },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  // sunset glow (--sh-glow)
  glow: { shadowColor: EMERALD, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.38, shadowRadius: 34, elevation: 6 },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 22 },
  orLine: { flex: 1, height: 1 },
  alt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 14, borderWidth: 1 },
  altTxt: { fontWeight: '700', fontSize: 14.5 },

  terms: { marginTop: 16, textAlign: 'center', fontSize: 11, lineHeight: 18 },
});
