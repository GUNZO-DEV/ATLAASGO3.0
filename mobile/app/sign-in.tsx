import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSignIn, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { ArrowLeft, LogIn } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';

/**
 * Email + password sign-in via Clerk (same instance as the web app). On
 * success the ClerkSupabaseBridge automatically exchanges the Clerk token for
 * a Supabase session, so data screens become authenticated.
 */
export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useClerkAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    if (!isLoaded || busy) return;
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        router.replace('/');
      } else {
        Alert.alert('Almost there', 'Additional verification is required. Try the web app for first-time setup.');
      }
    } catch (e: unknown) {
      const msg =
        (e as { errors?: { message?: string }[] })?.errors?.[0]?.message ??
        (e instanceof Error ? e.message : 'Sign in failed');
      Alert.alert('Sign in failed', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <View className="flex-1 px-6">
        <View className="pt-3">
          <PressableScale onPress={() => router.back()}>
            <View
              className="w-10 h-10 rounded-full items-center justify-center bg-white"
              style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
            >
              <ArrowLeft size={18} color="#1A1410" />
            </View>
          </PressableScale>
        </View>

        <View className="mt-8 mb-7">
          <Text className="text-[12px] uppercase font-bold mb-2" style={{ letterSpacing: 1.6, color: '#FF5722' }}>
            AtlaasGo · Account
          </Text>
          <Text className="font-display text-[32px]" style={{ fontWeight: '800', letterSpacing: -1, color: '#1A1410' }}>
            {isSignedIn ? 'You’re signed in.' : 'Welcome back.'}
          </Text>
          <Text className="mt-2 text-[14px]" style={{ color: '#7A6F66', lineHeight: 20 }}>
            {isSignedIn
              ? 'Your session is active — orders are linked to your account.'
              : 'Sign in with your AtlaasGo email and password.'}
          </Text>
        </View>

        {!isSignedIn && (
          <>
            <Text className="text-[11px] uppercase font-bold mb-1.5" style={{ letterSpacing: 0.6, color: '#7A6F66' }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@aui.ma"
              placeholderTextColor="#A89E94"
              className="bg-white rounded-2xl px-4 py-3.5 text-[15px] mb-4"
              style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.10)', color: '#1A1410' }}
            />
            <Text className="text-[11px] uppercase font-bold mb-1.5" style={{ letterSpacing: 0.6, color: '#7A6F66' }}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#A89E94"
              className="bg-white rounded-2xl px-4 py-3.5 text-[15px] mb-6"
              style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.10)', color: '#1A1410' }}
            />
            <Pressable
              onPress={handleSignIn}
              disabled={busy}
              className="rounded-2xl py-4 flex-row items-center justify-center"
              style={{ backgroundColor: '#FF5722', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <LogIn size={16} color="#fff" />
                  <Text className="text-white font-bold text-[15px] ml-2">Sign in</Text>
                </>
              )}
            </Pressable>
            <Text className="mt-4 text-[12px] text-center" style={{ color: '#7A6F66', lineHeight: 18 }}>
              First time? Create your account on atlaasgo.com, then sign in here.
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
