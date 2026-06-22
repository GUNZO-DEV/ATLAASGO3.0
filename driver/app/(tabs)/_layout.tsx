// AtlaasDriver 3.0 — bottom tab bar (cockpit surface).
// Three tabs: Drive (home), Earnings (wallet), Profile (user). Dark BG surface
// with a hairline top border and emerald active tint. The Drive tab shows a
// live online dot when the rider is online/busy.
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Wallet, User } from 'lucide-react-native';
import { useRiderProfile } from '../../hooks/useRiderProfile';
import { BG, LINE, EMERALD, MUTED, GLOW, LiveDot } from '../../components/dr/ui';

export default function TabsLayout() {
  const { profile } = useRiderProfile();
  const status = profile?.status ?? 'offline';
  const online = status === 'online' || status === 'busy';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: EMERALD,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: LINE,
          borderTopWidth: 1,
          height: 86,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
        sceneStyle: { backgroundColor: BG },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Drive',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Home size={size} color={color} />
              {online ? (
                <View style={{ position: 'absolute', top: -2, right: -4 }}>
                  <LiveDot color={GLOW} size={7} />
                </View>
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
