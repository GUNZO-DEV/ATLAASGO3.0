// AtlaasDriver 3.0 — bottom tab bar (cockpit surface).
// Three tabs: Drive (home), Earnings (wallet), Profile (user). Light white
// surface with a hairline top border and sunset-orange active tint. The Drive
// tab shows a live online dot (green) when the rider is online/busy.
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Wallet, User } from 'lucide-react-native';
import { useRiderProfile } from '../../hooks/useRiderProfile';
import { BG, CARD, LINE, EMERALD, MUTED, ONLINE, LiveDot } from '../../components/dr/ui';

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
          backgroundColor: CARD, // white --surface
          borderTopColor: LINE,
          borderTopWidth: 1,
          height: 86,
          paddingTop: 10,
          paddingBottom: 28,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.1 },
        sceneStyle: { backgroundColor: BG }, // cream page behind screens
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
                // green online dot with a white --surface ring, per the design
                <View
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -5,
                    width: 11,
                    height: 11,
                    borderRadius: 11,
                    backgroundColor: CARD,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <LiveDot color={ONLINE} size={7} />
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
