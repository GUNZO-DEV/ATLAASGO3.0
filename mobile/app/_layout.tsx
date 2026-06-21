import '../global.css';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider } from '@clerk/clerk-expo';
import { AuthProvider } from '../lib/auth';
import { CityProvider } from '../lib/ag3/CityContext';
import { Ag3CartProvider } from '../lib/ag3/cart';
import { ClerkSupabaseBridge } from '../lib/ClerkSupabaseBridge';
import { PushRegistrar } from '../components/PushRegistrar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { tokenCache } from '../lib/tokenCache';
import { StripeProviderMaybe } from '../lib/stripe';

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
        <StripeProviderMaybe>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <AuthProvider>
              <CityProvider>
                <Ag3CartProvider>
                  <ClerkSupabaseBridge />
                  <PushRegistrar />
                  <StatusBar style="dark" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: '#FBF7F2' },
                      animation: 'slide_from_right',
                    }}
                  >
                    {/* (tabs) group = Home/Search/Orders/Profile bottom nav.
                        Restaurant / cart / order / checkout etc. are auto-
                        registered as root stack screens (full-screen, no tabs). */}
                    <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
                  </Stack>
                </Ag3CartProvider>
              </CityProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
        </StripeProviderMaybe>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
