// AtlaasDriver 3.0 — auth gate / entry router.
// Decides what the signed-in rider sees: a splash while auth + roles resolve,
// the signed-out hero, the "not a driver yet" wall, or — for an approved
// rider — a redirect into the (tabs) cockpit (Drive / Earnings / Profile).
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useClerk } from '@clerk/clerk-expo';
import { LogIn, LogOut, Bike } from 'lucide-react-native';
import { useAuth } from '../lib/auth';
import { useRoles } from '../hooks/useRoles';
import { BG, EMERALD, GLOW, CREAM, MUTED, Enter, Tappable } from '../components/dr/ui';

export default function Entry() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user, loading: authLoading } = useAuth();
  if (!isLoaded || authLoading) return <Splash />;
  if (!isSignedIn || !user) return <SignedOut />;
  return <RoleGate />;
}

// Gate on the rider role once we know the user is signed in.
function RoleGate() {
  const { isRider, loading: rolesLoading } = useRoles();
  if (rolesLoading) return <Splash />;
  if (!isRider) return <NotADriver />;
  return <Redirect href="/(tabs)" />;
}

function Splash() {
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

function SignedOut() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <Enter>
          <LinearGradient
            colors={[EMERALD, GLOW]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 84,
              height: 84,
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 22,
              // sunset glow (--sh-glow)
              shadowColor: EMERALD,
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: 0.38,
              shadowRadius: 34,
              elevation: 6,
            }}
          >
            <Bike size={40} color="#fff" />
          </LinearGradient>
        </Enter>
        <Enter delay={120}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: CREAM, letterSpacing: -0.6, textAlign: 'center' }}>
            AtlaasGo Driver
          </Text>
          <Text style={{ marginTop: 10, fontSize: 14.5, color: MUTED, textAlign: 'center', lineHeight: 21 }}>
            Go online, grab orders from the pool, and watch your earnings climb.
          </Text>
        </Enter>
        <Enter delay={240}>
          <Link href="/sign-in" asChild>
            <Tappable>
              <LinearGradient
                colors={[EMERALD, GLOW]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  marginTop: 30,
                  borderRadius: 18,
                  paddingVertical: 16,
                  paddingHorizontal: 34,
                  flexDirection: 'row',
                  alignItems: 'center',
                  // sunset glow (--sh-glow)
                  shadowColor: EMERALD,
                  shadowOffset: { width: 0, height: 14 },
                  shadowOpacity: 0.38,
                  shadowRadius: 34,
                  elevation: 6,
                }}
              >
                <LogIn size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15.5, marginLeft: 9 }}>Sign in to drive</Text>
              </LinearGradient>
            </Tappable>
          </Link>
        </Enter>
      </View>
    </SafeAreaView>
  );
}

function NotADriver() {
  const { signOut } = useClerk();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <Enter>
          <Text style={{ fontSize: 23, fontWeight: '800', color: CREAM }}>Not a driver yet</Text>
        </Enter>
        <Enter delay={100}>
          <Text style={{ marginTop: 10, fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 21 }}>
            This account isn’t approved as an AtlaasGo rider. Apply in the customer app under “Drive with us” — once approved, your jobs appear here.
          </Text>
        </Enter>
        <Pressable onPress={() => signOut()} style={{ marginTop: 26, flexDirection: 'row', alignItems: 'center' }}>
          <LogOut size={16} color={MUTED} />
          <Text style={{ color: MUTED, fontWeight: '600', marginLeft: 6 }}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
