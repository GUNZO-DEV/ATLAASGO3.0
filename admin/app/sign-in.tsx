// AtlaasGo Admin — sign-in.
// Admins are provisioned (no self sign-up), so this is a clean email + password
// flow against the SAME Clerk production instance (clerk.atlaasgo.com) as the
// customer and driver apps. The ClerkSupabaseBridge then exchanges the session
// for a Supabase session, and useRoles gates the console to admin/super_admin.
// On success → router.replace('/'), which lands on the role-gated console.
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSignIn } from '@clerk/clerk-expo';
import { ShieldCheck, ChevronRight } from 'lucide-react-native';
import { useAg3Theme } from '../components/ag3/theme';

function clerkErr(e: unknown): string {
  return (
    (e as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ??
    (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
    (e instanceof Error ? e.message : 'Something went wrong')
  );
}

export default function SignIn() {
  const t = useAg3Theme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    if (!isLoaded || busy) return;
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your admin email and password.');
      return;
    }
    setBusy(true);
    try {
      const a = await signIn.create({ identifier: email.trim(), password });
      if (a.status === 'complete') {
        await setActive({ session: a.createdSessionId });
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

  const PLACEHOLDER = t.colors.muted;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        >
          {/* ── HERO ── */}
          <LinearGradient
            colors={t.gradients.warm}
            start={t.gradients.start}
            end={t.gradients.end}
            style={{ paddingTop: insets.top + 28, paddingHorizontal: 28, paddingBottom: 46 }}
          >
            <View style={styles.mark}>
              <ShieldCheck size={30} color="#fff" />
            </View>
            <Text style={styles.word}>
              Atlaas<Text style={{ fontWeight: '900' }}>Admin</Text>
            </Text>
            <Text style={styles.tag}>Back-office console for the AtlaasGo platform.</Text>
          </LinearGradient>

          {/* ── SHEET ── */}
          <View
            style={[
              styles.sheet,
              { backgroundColor: t.colors.bg, borderTopLeftRadius: t.radii.xl, borderTopRightRadius: t.radii.xl },
            ]}
          >
            <Text style={[styles.h, { color: t.colors.fg }]}>Welcome back.</Text>
            <Text style={[styles.sub, { color: t.colors.muted }]}>
              Sign in with your administrator account.
            </Text>

            <Text style={[styles.label, { color: t.colors.muted }]}>Email</Text>
            <View style={[styles.field, { backgroundColor: t.colors.surface, borderColor: t.colors.line }]}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@atlaasgo.com"
                placeholderTextColor={PLACEHOLDER}
                style={[styles.input, { color: t.colors.fg }]}
              />
            </View>

            <Text style={[styles.label, { color: t.colors.muted }]}>Password</Text>
            <View style={[styles.field, { backgroundColor: t.colors.surface, borderColor: t.colors.line }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={PLACEHOLDER}
                onSubmitEditing={handleSignIn}
                style={[styles.input, { color: t.colors.fg }]}
              />
            </View>

            <Pressable onPress={handleSignIn} disabled={busy}>
              <LinearGradient
                colors={t.gradients.warm}
                start={t.gradients.start}
                end={t.gradients.end}
                style={[styles.cta, t.shadows.glow, { opacity: busy ? 0.55 : 1 }]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.ctaTxt}>Sign in</Text>
                    <ChevronRight size={19} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Text style={[styles.note, { color: t.colors.muted }]}>
              Admin accounts are provisioned by AtlaasGo. Contact the platform owner if you need access.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // hero
  mark: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: { fontWeight: '900', fontSize: 30, letterSpacing: -1, color: '#fff', marginTop: 18 },
  tag: { fontSize: 14, color: 'rgba(255,255,255,0.95)', marginTop: 8, fontWeight: '500', maxWidth: 300, lineHeight: 20 },

  // sheet
  sheet: { marginTop: -30, paddingHorizontal: 26, paddingTop: 26, paddingBottom: 40, flex: 1 },
  h: { fontWeight: '800', fontSize: 24, letterSpacing: -0.6 },
  sub: { fontSize: 13.5, marginTop: 5, lineHeight: 20 },

  label: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '700', marginTop: 18, marginBottom: 9 },
  field: { borderWidth: 1.5, borderRadius: 15, overflow: 'hidden' },
  input: { paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, fontWeight: '600' },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    height: 54,
    borderRadius: 15,
  },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

  note: { marginTop: 18, textAlign: 'center', fontSize: 12, lineHeight: 18 },
});
