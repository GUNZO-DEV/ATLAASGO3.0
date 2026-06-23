// AtlaasDriver — OAuth/SSO redirect landing.
// The Clerk Google flow redirects to atlaasgodriver://sso-callback; this route
// just shows a spinner so the redirect resolves to a real screen while
// startSSOFlow settles the session back on the sign-in screen. Once
// setActive() runs there, the auth gate (app/index.tsx) takes over, so we
// bounce back to '/' if a session already exists.
//
// CONFIG FOLLOWUP: add atlaasgodriver://sso-callback to the Clerk redirect
// allowlist for the production instance (the customer app uses atlaasgo://).
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useAuth } from '@clerk/clerk-expo';
import { Bike } from 'lucide-react-native';
import { BG, EMERALD } from '../components/dr/ui';

export default function SSOCallback() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/');
  }, [isLoaded, isSignedIn, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
      <MotiView
        from={{ opacity: 0.4, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 900, loop: true }}
      >
        <Bike size={36} color={EMERALD} />
      </MotiView>
    </View>
  );
}
