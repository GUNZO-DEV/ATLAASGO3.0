// AtlaasGo 3.0 — Customer login (sunset hero + cream sheet, phone/email → OTP).
// Native re-skin of app2/screen-login2.jsx from the live Claude Design project,
// onto the ag3 foundation (useAg3Theme + sunset gradients + react-native-svg).
//
// AUTH (per product decision — "email OTP now, phone/social as placeholders"):
//   EMAIL path is wired to Clerk's passwordless email_code, unified sign-in OR
//   sign-up:
//     - signIn.create({ identifier }) → if an email_code first factor exists,
//       prepareFirstFactor(email_code) → 6-digit code → attemptFirstFactor → setActive.
//     - if the identifier isn't found → signUp.create({ email, auto username +
//       random password to satisfy the instance }) → prepareEmailAddressVerification
//       (email_code) → attemptEmailAddressVerification → setActive. The password is
//       never shown; the user always returns via an email code (passwordless UX).
//   EMAIL also supports a classic PASSWORD path: a "Sign in with password
//   instead" affordance reveals a password field and uses the proven
//   signIn.create({ identifier, password }) → setActive → '/' flow, so existing
//   password users can log in. The OTP path stays the default.
//   GOOGLE is wired to Clerk OAuth via useSSO().startSSOFlow (redirectUrl =
//   Linking.createURL('/')) → setActive → '/'. It works once Google is enabled
//   in the Clerk instance. PHONE tab + Apple stay gated ("coming soon").
//   "Browse as guest" → home (the app browses signed-out).
//
// On a completed session the ClerkSupabaseBridge exchanges the Clerk token for a
// Supabase session and clerk-sync provisions profile/wallet/role rows.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import Svg, { Path, Circle } from 'react-native-svg';
import { useSignIn, useSignUp, useSSO } from '@clerk/clerk-expo';
import { Zap, Clock, ChevronRight, Mail, Lock, Check, ArrowLeft, Apple } from 'lucide-react-native';

import { useAg3Theme, type Ag3Theme } from '../components/ag3/theme';

// Completes any pending OAuth/SSO web-browser session on app focus (required for
// the redirect-based Clerk Google flow to settle on native).
WebBrowser.maybeCompleteAuthSession();

type Step = 'entry' | 'otp' | 'done';
type ModeT = 'phone' | 'email';
type Flow = 'signin' | 'signup';

const PHONE_MAX = 9;
const WARM: [string, string, string] = ['#FF5722', '#FF5722', '#FFB74D'];

function fmtPhone(d: string) {
  const p = d.slice(0, PHONE_MAX);
  if (!p) return '';
  const head = p.slice(0, 1);
  const rest = p.slice(1).replace(/(\d{2})(?=\d)/g, '$1 ');
  return (head + (rest ? ' ' + rest : '')).trim();
}

function clerkErr(e: unknown, fallback: string): string {
  return (
    (e as { errors?: { message?: string; longMessage?: string }[] })?.errors?.[0]?.longMessage ??
    (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
    (e instanceof Error ? e.message : fallback)
  );
}
function errCode(e: unknown): string {
  return (e as { errors?: { code?: string }[] })?.errors?.[0]?.code ?? '';
}

// Brand pin glyph with an Atlas peak (matches the app icon).
function PinMark({ color }: { color: string }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 48 48">
      <Path d="M24 5 C16.5 5 11 10.7 11 18 C11 28 24 41 24 41 C24 41 37 28 37 18 C37 10.7 31.5 5 24 5 Z" fill="#fff" />
      <Path d="M17.6 24 L22.5 16 L25.8 20.6 L28 17.8 L30.4 24 Z" fill={color} />
      <Circle cx="29" cy="14.6" r="1.7" fill={color} />
    </Svg>
  );
}

export default function CustomerLoginScreen() {
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [step, setStep] = useState<Step>('entry');
  const [mode, setMode] = useState<ModeT>('email'); // email is the wired path → default to it
  const [flow, setFlow] = useState<Flow>('signin');
  const [usePassword, setUsePassword] = useState(false); // email path: classic password vs OTP
  const [digits, setDigits] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const valid = mode === 'phone' ? digits.length >= PHONE_MAX : emailOk;
  // Password sign-in needs a valid email + a non-empty password; otherwise use `valid`.
  const ctaReady = mode === 'email' && usePassword ? emailOk && password.length > 0 : valid;
  const dest = mode === 'phone' ? `+212 ${fmtPhone(digits)}` : email.trim();
  const otpFull = otp.every((d) => d !== '');

  useEffect(() => {
    if (step !== 'otp' || secs <= 0) return;
    const tmr = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(tmr);
  }, [step, secs]);

  function comingSoon() {
    Alert.alert(tr('auth.comingSoonTitle'), tr('auth.comingSoonBody'));
  }

  // ── Email path: unified passwordless sign-in / sign-up via email_code ──
  async function startEmail() {
    if (!signInLoaded || !signUpLoaded || busy) return;
    const id = email.trim();
    setBusy(true);
    try {
      const attempt = await signIn.create({ identifier: id });
      const factor = attempt.supportedFirstFactors?.find(
        (f): f is typeof f & { emailAddressId: string } => f.strategy === 'email_code' && 'emailAddressId' in f,
      );
      if (!factor) throw new Error('no-email-code');
      await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      setFlow('signin');
      goOtp();
    } catch (e) {
      if (errCode(e) === 'form_identifier_not_found') {
        // New user → create a passwordless-feeling account (auto username + random pw).
        try {
          const base = (id.split('@')[0] || 'atlas').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'atlas';
          await signUp.create({
            emailAddress: id,
            username: `${base}${Math.floor(1000 + Math.random() * 9000)}`,
            password: `Ag!${Math.random().toString(36).slice(2, 12)}X9q`,
          });
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          setFlow('signup');
          goOtp();
        } catch (e2) {
          Alert.alert(tr('auth.createFailedTitle'), clerkErr(e2, tr('auth.genericError')));
        }
      } else {
        Alert.alert(tr('auth.signInFailedTitle'), clerkErr(e, tr('auth.genericError')));
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Email path: classic email + password sign-in (proven flow) ──
  async function startPassword() {
    if (!signInLoaded || busy) return;
    const id = email.trim();
    if (!id || !password) {
      Alert.alert(tr('auth.missingDetailsTitle'), tr('auth.missingDetailsBody'));
      return;
    }
    setBusy(true);
    try {
      const attempt = await signIn.create({ identifier: id, password });
      if (attempt.status === 'complete') {
        await setSignInActive({ session: attempt.createdSessionId });
        succeed();
      } else {
        Alert.alert(tr('auth.almostThereTitle'), tr('auth.signInVerifyBody'));
      }
    } catch (e) {
      Alert.alert(tr('auth.signInFailedTitle'), clerkErr(e, tr('auth.genericError')));
    } finally {
      setBusy(false);
    }
  }

  // ── Google OAuth via Clerk SSO (works once Google is enabled in Clerk) ──
  async function startGoogle() {
    if (busy) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: createURL('/'),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        succeed();
      }
      // No session → user cancelled the browser, or further steps are required
      // (e.g. MFA/transfer); stay on the screen silently.
    } catch (e) {
      Alert.alert(tr('auth.googleFailedTitle'), clerkErr(e, tr('auth.genericError')));
    } finally {
      setBusy(false);
    }
  }

  function onContinue() {
    if (mode === 'phone') {
      comingSoon();
      return;
    }
    if (usePassword) {
      void startPassword();
      return;
    }
    if (!valid) return;
    void startEmail();
  }

  function goOtp() {
    setStep('otp');
    setSecs(38);
    setOtp(['', '', '', '', '', '']);
    setTimeout(() => otpRefs.current[0]?.focus(), 320);
  }

  function setOtpAt(i: number, v: string) {
    const c = v.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[i] = c;
      return next;
    });
    if (c && i < 5) otpRefs.current[i + 1]?.focus();
  }
  function onOtpKey(i: number, key: string) {
    if (key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }

  async function verify() {
    if (!otpFull || busy || !signIn || !signUp) return;
    const code = otp.join('');
    setBusy(true);
    try {
      if (flow === 'signin') {
        const r = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
        if (r.status === 'complete') {
          await setSignInActive({ session: r.createdSessionId });
          succeed();
        } else Alert.alert(tr('auth.almostThereTitle'), tr('auth.verifyIncompleteBody'));
      } else {
        const r = await signUp.attemptEmailAddressVerification({ code });
        if (r.status === 'complete') {
          await setSignUpActive({ session: r.createdSessionId });
          succeed();
        } else Alert.alert(tr('auth.almostThereTitle'), tr('auth.verifyIncompleteBody'));
      }
    } catch (e) {
      Alert.alert(tr('auth.verifyFailedTitle'), clerkErr(e, tr('auth.genericError')));
    } finally {
      setBusy(false);
    }
  }

  function succeed() {
    setStep('done');
    setTimeout(() => router.replace('/'), 1500);
  }

  async function resend() {
    if (secs > 0 || !signIn || !signUp) return;
    try {
      if (flow === 'signin') {
        const attempt = await signIn.create({ identifier: email.trim() });
        const factor = attempt.supportedFirstFactors?.find(
          (f): f is typeof f & { emailAddressId: string } => f.strategy === 'email_code' && 'emailAddressId' in f,
        );
        if (factor) await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      }
      setSecs(38);
    } catch (e) {
      Alert.alert(tr('auth.resendFailedTitle'), clerkErr(e, tr('auth.genericError')));
    }
  }

  // ── Success overlay ──
  if (step === 'done') {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <View style={{ width: 96, height: 96, borderRadius: 999, backgroundColor: t.colors.ok, alignItems: 'center', justifyContent: 'center' }}>
          <Check size={46} color="#fff" strokeWidth={3} />
        </View>
        <Text style={[styles.h, { color: t.colors.fg, marginTop: 26 }]}>{tr('auth.youreIn')}</Text>
        <Text style={[styles.sub, { color: t.colors.muted, textAlign: 'center', maxWidth: 260 }]}>{tr('auth.youreInSub')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {/* ── HERO ── */}
          <LinearGradient colors={WARM} locations={[0, 0.42, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ paddingTop: insets.top + 30, paddingHorizontal: 28, paddingBottom: 60 }}>
            <View style={styles.mark}>
              <PinMark color={t.colors.primary} />
            </View>
            <Text style={styles.word}>
              Atlaas<Text style={{ opacity: 0.82 }}>Go</Text>
            </Text>
            <Text style={styles.tag}>{tr('auth.tagline')}</Text>
            <View style={styles.chips}>
              <View style={styles.chip}>
                <Zap size={13} color="#fff" fill="#fff" strokeWidth={0} />
                <Text style={styles.chipTxt}>{tr('auth.chipTrusted')}</Text>
              </View>
              <View style={styles.chip}>
                <Clock size={13} color="#fff" />
                <Text style={styles.chipTxt}>{tr('auth.chipEta')}</Text>
              </View>
            </View>
            {/* mountain ridge cutting into the sheet */}
            <Svg width="100%" height={46} viewBox="0 0 420 60" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: -1 }}>
              <Path d="M0 60 L0 40 L70 14 L130 38 L210 8 L300 36 L360 16 L420 42 L420 60 Z" fill={t.colors.bg} />
            </Svg>
          </LinearGradient>

          {/* ── SHEET ── */}
          <View style={[styles.sheet, { backgroundColor: t.colors.bg }]}>
            <View style={[styles.grip, { backgroundColor: t.colors.line }]} />

            {step === 'entry' ? (
              <>
                <Text style={[styles.h, { color: t.colors.fg }]}>{tr('auth.loginTitle')}</Text>
                <Text style={[styles.sub, { color: t.colors.muted }]}>
                  {mode === 'phone' ? tr('auth.loginSubPhone') : tr('auth.loginSubEmail')}
                </Text>

                {/* phone / email toggle */}
                <View style={[styles.seg, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
                  {(['phone', 'email'] as ModeT[]).map((k) => {
                    const active = mode === k;
                    return (
                      <Pressable key={k} onPress={() => setMode(k)} style={[styles.segBtn, active && [{ backgroundColor: t.colors.surface }, t.shadows.card]]}>
                        <Text style={{ fontSize: 13.5, fontWeight: active ? '800' : '600', color: active ? t.colors.fg : t.colors.muted }}>
                          {k === 'phone' ? tr('auth.tabPhone') : tr('auth.tabEmail')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {mode === 'phone' ? (
                  <>
                    <Text style={[styles.label, { color: t.colors.muted }]}>{tr('auth.phoneLabel')}</Text>
                    <View style={[styles.field, { backgroundColor: t.colors.surface, borderColor: t.colors.line }]}>
                      <View style={[styles.cc, { backgroundColor: t.colors.surface2, borderColor: t.colors.line }]}>
                        <Text style={{ fontSize: 17 }}>🇲🇦</Text>
                        <Text style={{ fontWeight: '700', fontSize: 15, color: t.colors.fg }}>+212</Text>
                      </View>
                      <TextInput
                        value={fmtPhone(digits)}
                        onChangeText={(v) => setDigits(v.replace(/\D/g, '').slice(0, PHONE_MAX))}
                        keyboardType="number-pad"
                        placeholder="6 12 34 56 78"
                        placeholderTextColor={t.colors.muted}
                        style={[styles.input, { color: t.colors.fg }]}
                      />
                    </View>
                    <Text style={{ fontSize: 11.5, color: t.colors.muted, marginTop: 8 }}>{tr('auth.phoneSoonNote')}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.label, { color: t.colors.muted }]}>{tr('auth.emailAddressLabel')}</Text>
                    <View style={[styles.field, { backgroundColor: t.colors.surface, borderColor: t.colors.line }]}>
                      <View style={[styles.cc, { backgroundColor: t.colors.surface2, borderColor: t.colors.line, paddingHorizontal: 13 }]}>
                        <Mail size={18} color={t.colors.muted} />
                      </View>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        placeholder="you@email.com"
                        placeholderTextColor={t.colors.muted}
                        onSubmitEditing={usePassword ? undefined : onContinue}
                        style={[styles.input, { color: t.colors.fg, fontWeight: '600' }]}
                      />
                    </View>

                    {usePassword && (
                      <>
                        <Text style={[styles.label, { color: t.colors.muted }]}>{tr('auth.passwordLabel')}</Text>
                        <View style={[styles.field, { backgroundColor: t.colors.surface, borderColor: t.colors.line }]}>
                          <View style={[styles.cc, { backgroundColor: t.colors.surface2, borderColor: t.colors.line, paddingHorizontal: 13 }]}>
                            <Lock size={18} color={t.colors.muted} />
                          </View>
                          <TextInput
                            value={password}
                            onChangeText={setPassword}
                            autoCapitalize="none"
                            autoComplete="password"
                            secureTextEntry
                            placeholder={tr('auth.passwordPlaceholder')}
                            placeholderTextColor={t.colors.muted}
                            onSubmitEditing={onContinue}
                            style={[styles.input, { color: t.colors.fg, fontWeight: '600' }]}
                          />
                        </View>
                      </>
                    )}

                    {/* Toggle between the email-OTP default and classic password sign-in */}
                    <Pressable
                      onPress={() => setUsePassword((v) => !v)}
                      style={{ marginTop: 12, alignSelf: 'flex-start' }}
                      hitSlop={8}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: t.colors.primary }}>
                        {usePassword ? tr('auth.useEmailCodeInstead') : tr('auth.usePasswordInstead')}
                      </Text>
                    </Pressable>
                  </>
                )}

                <Pressable onPress={onContinue} disabled={!ctaReady || busy}>
                  <LinearGradient colors={t.gradients.sunset} start={t.gradients.start} end={t.gradients.end} style={[styles.cta, t.shadows.glow, { opacity: !ctaReady || busy ? 0.45 : 1 }]}>
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.ctaTxt}>{usePassword && mode === 'email' ? tr('auth.signIn') : tr('auth.continueBtn')}</Text>
                        <ChevronRight size={19} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* divider + social placeholders */}
                <View style={styles.orRow}>
                  <View style={[styles.orLine, { backgroundColor: t.colors.line }]} />
                  <Text style={{ color: t.colors.muted, fontSize: 11.5, fontWeight: '600' }}>{tr('auth.orContinueWith')}</Text>
                  <View style={[styles.orLine, { backgroundColor: t.colors.line }]} />
                </View>
                <Pressable onPress={comingSoon} style={[styles.alt, { backgroundColor: t.colors.surface, borderColor: t.colors.line }, t.shadows.card]}>
                  <Apple size={17} color={t.colors.fg} fill={t.colors.fg} />
                  <Text style={[styles.altTxt, { color: t.colors.fg }]}>{tr('auth.continueApple')}</Text>
                </Pressable>
                <Pressable onPress={() => void startGoogle()} disabled={busy} style={[styles.alt, { backgroundColor: t.colors.surface, borderColor: t.colors.line, marginTop: 10, opacity: busy ? 0.55 : 1 }, t.shadows.card]}>
                  <Svg width={18} height={18} viewBox="0 0 18 18">
                    <Path fill={t.colors.primary} d="M9 7.4v3.4h4.8c-.2 1.2-1.5 3.6-4.8 3.6A5.4 5.4 0 1 1 12.5 5l2.4-2.3A8.7 8.7 0 1 0 9 17.7c5 0 8.4-3.6 8.4-8.6 0-.6 0-1-.1-1.7H9Z" />
                  </Svg>
                  <Text style={[styles.altTxt, { color: t.colors.fg }]}>{tr('auth.continueGoogle')}</Text>
                </Pressable>

                <Pressable onPress={() => router.replace('/')} style={{ marginTop: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: t.colors.primary }}>{tr('auth.browseGuest')} ›</Text>
                </Pressable>
                <Text style={[styles.terms, { color: t.colors.muted }]}>{tr('auth.termsLine')}</Text>
              </>
            ) : (
              <>
                {/* OTP step */}
                <Pressable onPress={() => setStep('entry')} style={[styles.back, { backgroundColor: t.colors.surface, borderColor: t.colors.line }, t.shadows.card]}>
                  <ArrowLeft size={20} color={t.colors.fg} />
                </Pressable>
                <Text style={[styles.h, { color: t.colors.fg }]}>{tr('auth.otpTitle')}</Text>
                <Text style={[styles.sub, { color: t.colors.muted }]}>
                  {tr('auth.otpSentTo')} <Text style={{ color: t.colors.fg, fontWeight: '700' }}>{dest}</Text>
                  <Text onPress={() => setStep('entry')} style={{ color: t.colors.primary, fontWeight: '700' }}>  {tr('auth.change')}</Text>
                </Text>

                <View style={styles.otpRow}>
                  {otp.map((d, i) => (
                    <TextInput
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      value={d}
                      onChangeText={(v) => setOtpAt(i, v)}
                      onKeyPress={({ nativeEvent }) => onOtpKey(i, nativeEvent.key)}
                      keyboardType="number-pad"
                      maxLength={1}
                      style={[
                        styles.otpBox,
                        { backgroundColor: t.colors.surface, borderColor: d ? t.colors.primary : t.colors.line, color: t.colors.fg },
                      ]}
                    />
                  ))}
                </View>

                <Pressable onPress={verify} disabled={!otpFull || busy}>
                  <LinearGradient colors={t.gradients.sunset} start={t.gradients.start} end={t.gradients.end} style={[styles.cta, t.shadows.glow, { opacity: !otpFull || busy ? 0.45 : 1 }]}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaTxt}>{tr('auth.verifyContinueBtn')}</Text>}
                  </LinearGradient>
                </Pressable>

                <View style={{ marginTop: 20, alignItems: 'center' }}>
                  {secs > 0 ? (
                    <Text style={{ fontSize: 13, color: t.colors.muted }}>
                      {tr('auth.resendIn')} <Text style={{ color: t.colors.fg, fontWeight: '700' }}>0:{String(secs).padStart(2, '0')}</Text>
                    </Text>
                  ) : (
                    <Pressable onPress={resend}>
                      <Text style={{ fontSize: 13, color: t.colors.primary, fontWeight: '700' }}>{tr('auth.resendCode')}</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  sheet: { marginTop: -34, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 26, paddingTop: 14, paddingBottom: 40, flex: 1 },
  grip: { width: 42, height: 5, borderRadius: 999, alignSelf: 'center', marginBottom: 16 },
  h: { fontWeight: '800', fontSize: 24, letterSpacing: -0.6 },
  sub: { fontSize: 13.5, marginTop: 5, lineHeight: 20 },

  seg: { flexDirection: 'row', gap: 4, borderRadius: 14, borderWidth: 1, padding: 4, marginTop: 18 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 11 },

  label: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '700', marginTop: 22, marginBottom: 9 },
  field: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1.5, borderRadius: 15, overflow: 'hidden' },
  cc: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRightWidth: 1 },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 15, fontSize: 16, minWidth: 0 },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, height: 54, borderRadius: 15 },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 22 },
  orLine: { flex: 1, height: 1 },
  alt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 14, borderWidth: 1 },
  altTxt: { fontWeight: '700', fontSize: 14.5 },

  terms: { marginTop: 16, textAlign: 'center', fontSize: 11, lineHeight: 18 },

  back: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 18 },
  otpRow: { flexDirection: 'row', gap: 9, marginTop: 22 },
  otpBox: { flex: 1, aspectRatio: 1, textAlign: 'center', borderWidth: 1.5, borderRadius: 14, fontWeight: '800', fontSize: 24 },
});
