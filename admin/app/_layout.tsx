import '../global.css';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider } from '@clerk/clerk-expo';
import { AuthProvider } from '../lib/auth';
import { ClerkSupabaseBridge } from '../components/ClerkSupabaseBridge';
import { tokenCache } from '../lib/tokenCache';

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

// AtlaasGo Admin — root layout. Same provider stack as the customer/driver apps:
// ClerkProvider (identity) → AuthProvider (Supabase session) → ClerkSupabaseBridge
// (exchanges the Clerk JWT for a Supabase session). No push registrar — the
// admin console doesn't receive notifications.
export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <ClerkSupabaseBridge />
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#FBF6EF' },
                animation: 'slide_from_right',
              }}
            />
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
