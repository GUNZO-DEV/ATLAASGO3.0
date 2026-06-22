import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { ArrowLeft, LogIn, UserPlus, MailCheck, KeyRound, Bike } from 'lucide-react-native';

/**
 * Driver sign-in — same Clerk instance + flows as the customer app:
 * email/password sign-in, email-code sign-up, and reset-by-email-code.
 * The ClerkSupabaseBridge then exchanges the session for Supabase; useRoles
 * gates the dashboard to approved riders.
 */
const BG = '#07140E';
const CARD = 'rgba(255,255,255,0.05)';
const LINE = 'rgba(255,255,255,0.10)';
const EMERALD = '#10B981';
const GLOW = '#34D399';
const DEEP = '#0E7C5A';
const CREAM = '#EAF3EE';
const MUTED = '#7E948A';
type Mode = 'signin' | 'signup';

function clerkErr(e: unknown): string {
  return (
    (e as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ??
    (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
    (e instanceof Error ? e.message : 'Something went wrong')
  );
}

export default function SignIn() {
  const router = useRouter();
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

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

  async function handleSignIn() {
    if (!signInLoaded || busy) return;
    if (!email.trim() || !password) return Alert.alert('Missing details', 'Enter your email and password.');
    setBusy(true);
    try {
      const a = await signIn.create({ identifier: email.trim(), password });
      if (a.status === 'complete') { await setSignInActive({ session: a.createdSessionId }); router.replace('/'); }
      else Alert.alert('Almost there', 'Additional verification is required for this account.');
    } catch (e) { Alert.alert('Sign in failed', clerkErr(e)); } finally { setBusy(false); }
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
    } catch (e) { Alert.alert('Could not create account', clerkErr(e)); } finally { setBusy(false); }
  }
  async function handleVerify() {
    if (!signUpLoaded || busy) return;
    if (code.trim().length < 6) return Alert.alert('Enter the code', 'Type the 6-digit code we emailed you.');
    setBusy(true);
    try {
      const a = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (a.status === 'complete') { await setSignUpActive({ session: a.createdSessionId }); router.replace('/'); }
      else Alert.alert('Almost there', 'Verification incomplete — try again.');
    } catch (e) { Alert.alert('Verification failed', clerkErr(e)); } finally { setBusy(false); }
  }
  async function handleForgot() {
    if (!signInLoaded || busy) return;
    if (!email.trim()) return Alert.alert('Enter your email', 'Type your account email above, then tap “Forgot password?” again.');
    setBusy(true);
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() });
      setResetCode(''); setNewPassword(''); setPendingReset(true);
    } catch (e) { Alert.alert('Could not start reset', clerkErr(e)); } finally { setBusy(false); }
  }
  async function handleReset() {
    if (!signInLoaded || busy) return;
    if (resetCode.trim().length < 6) return Alert.alert('Enter the code', 'Type the 6-digit code we emailed you.');
    if (newPassword.length < 8) return Alert.alert('Stronger password', 'At least 8 characters.');
    setBusy(true);
    try {
      const a = await signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code: resetCode.trim(), password: newPassword });
      if (a.status === 'complete') { await setSignInActive({ session: a.createdSessionId }); router.replace('/'); }
      else Alert.alert('Almost there', 'Additional verification is required — try signing in again.');
    } catch (e) { Alert.alert('Reset failed', clerkErr(e)); } finally { setBusy(false); }
  }

  const label = (t: string) => <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: MUTED, marginBottom: 7, textTransform: 'uppercase' }}>{t}</Text>;
  const inputProps = {
    style: { backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: LINE, color: CREAM },
    placeholderTextColor: '#5E6F66',
  } as const;
  const GradientBtn = ({ icon, text, onPress }: { icon: React.ReactNode; text: string; onPress: () => void }) => (
    <Pressable onPress={onPress} disabled={busy}>
      <LinearGradient colors={[GLOW, EMERALD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
        {busy ? <ActivityIndicator color="#04140D" /> : <>{icon}<Text style={{ color: '#04140D', fontWeight: '800', fontSize: 15, marginLeft: 8 }}>{text}</Text></>}
      </LinearGradient>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingTop: 12 }}>
            <Pressable onPress={() => router.back()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE }}>
              <ArrowLeft size={18} color={CREAM} />
            </Pressable>
          </View>

          <MotiView from={{ opacity: 0, translateY: 14 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 420 }}>
            <View style={{ marginTop: 26, marginBottom: 22, alignItems: 'flex-start' }}>
              <LinearGradient colors={[EMERALD, DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Bike size={28} color="#fff" />
              </LinearGradient>
              <Text style={{ fontSize: 11.5, fontWeight: '800', letterSpacing: 1.6, color: EMERALD }}>ATLAASGO · DRIVER</Text>
              <Text style={{ fontSize: 29, fontWeight: '800', letterSpacing: -0.8, color: CREAM, marginTop: 6 }}>
                {pendingReset ? 'Reset password.' : pendingCode ? 'Check your email.' : mode === 'signin' ? 'Welcome back, rider.' : 'Become a rider.'}
              </Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: MUTED, lineHeight: 20 }}>
                {pendingReset ? `Enter the code we sent to ${email.trim()} and a new password.`
                  : pendingCode ? `We sent a 6-digit code to ${email.trim()}.`
                  : mode === 'signin' ? 'Sign in to go online and accept deliveries.'
                  : 'Create an account, then apply to drive in the customer app.'}
              </Text>
            </View>
          </MotiView>

          <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 440, delay: 120 }}>
            {pendingReset ? (
              <>
                {label('Verification code')}
                <TextInput value={resetCode} onChangeText={setResetCode} keyboardType="number-pad" placeholder="123456" maxLength={6} {...inputProps} />
                {label('New password')}
                <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="At least 8 characters" {...inputProps} />
                <GradientBtn icon={<KeyRound size={16} color="#04140D" />} text="Reset & sign in" onPress={handleReset} />
                <Pressable onPress={() => { setPendingReset(false); setResetCode(''); setNewPassword(''); }} style={{ marginTop: 14 }}>
                  <Text style={{ textAlign: 'center', fontSize: 12.5, color: MUTED }}>Back to sign in</Text>
                </Pressable>
              </>
            ) : pendingCode ? (
              <>
                {label('Verification code')}
                <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="123456" maxLength={6} {...inputProps} />
                <GradientBtn icon={<MailCheck size={16} color="#04140D" />} text="Verify & continue" onPress={handleVerify} />
                <Pressable onPress={() => { setPendingCode(false); setCode(''); }} style={{ marginTop: 14 }}>
                  <Text style={{ textAlign: 'center', fontSize: 12.5, color: MUTED }}>Use a different email</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', padding: 4, borderRadius: 14, marginBottom: 20, backgroundColor: CARD, borderWidth: 1, borderColor: LINE }}>
                  {(['signin', 'signup'] as Mode[]).map((m) => (
                    <Pressable key={m} onPress={() => setMode(m)} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', backgroundColor: mode === m ? EMERALD : 'transparent' }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: mode === m ? '#04140D' : MUTED }}>{m === 'signin' ? 'Sign in' : 'Create account'}</Text>
                    </Pressable>
                  ))}
                </View>
                {label('Email')}
                <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@aui.ma" {...inputProps} />
                {mode === 'signup' && (<>{label('Username')}<TextInput value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="atlas_rider" {...inputProps} /></>)}
                {label('Password')}
                <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={mode === 'signin' ? '••••••••' : 'At least 8 characters'} {...inputProps} />
                {mode === 'signin' && (
                  <Pressable onPress={handleForgot} style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: GLOW }}>Forgot password?</Text>
                  </Pressable>
                )}
                <GradientBtn
                  icon={mode === 'signin' ? <LogIn size={16} color="#04140D" /> : <UserPlus size={16} color="#04140D" />}
                  text={mode === 'signin' ? 'Sign in' : 'Create account'}
                  onPress={mode === 'signin' ? handleSignIn : handleSignUp}
                />
              </>
            )}
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
