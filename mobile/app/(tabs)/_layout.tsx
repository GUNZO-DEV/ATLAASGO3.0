// AtlaasGo 3.0 — bottom tab bar (Home / Search / Orders / Profile).
// A route GROUP: the parens keep URLs unchanged (/, /search, /orders,
// /account) so every router.push('/search') etc. across the app still works.
// Restaurant / cart / order / checkout stay in the ROOT stack (app/_layout.tsx)
// so they render full-screen with NO tab bar.
//
// Material-3 look from the 3.0 prototype: cream/ink surface, hairline top
// border, terracotta active token with a soft pill behind the active icon.
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAg3Theme } from '../../components/ag3/theme';
import { IHome, ISearch, IReceipt, IUser } from '../../components/ag3/icons';
import type { AgIcon } from '../../components/ag3/icons';

function TabItem({
  Icon,
  label,
  focused,
  color,
  activeBg,
}: {
  Icon: AgIcon;
  label: string;
  focused: boolean;
  color: string;
  activeBg: string;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 64, gap: 3 }}>
      <View
        style={{
          width: 56,
          height: 30,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? activeBg : 'transparent',
        }}
      >
        <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: focused ? '800' : '600',
          color,
          letterSpacing: 0.1,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const t = useAg3Theme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const active = t.colors.primary;
  const inactive = t.colors.muted;
  const activeBg = t.isDark ? 'rgba(255,87,34,0.20)' : 'rgba(255,87,34,0.12)';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // we render our own label inside TabItem
        sceneStyle: { backgroundColor: t.colors.bg },
        tabBarStyle: {
          backgroundColor: t.colors.surface,
          borderTopColor: t.colors.line,
          borderTopWidth: 1,
          height: 58 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          ...Platform.select({
            android: { elevation: 12 },
            default: {
              shadowColor: '#1A1410',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.06,
              shadowRadius: 16,
            },
          }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem
              Icon={IHome}
              label={tr('tabs.home')}
              focused={focused}
              color={focused ? active : inactive}
              activeBg={activeBg}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem
              Icon={ISearch}
              label={tr('tabs.search')}
              focused={focused}
              color={focused ? active : inactive}
              activeBg={activeBg}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem
              Icon={IReceipt}
              label={tr('tabs.orders')}
              focused={focused}
              color={focused ? active : inactive}
              activeBg={activeBg}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem
              Icon={IUser}
              label={tr('tabs.profile')}
              focused={focused}
              color={focused ? active : inactive}
              activeBg={activeBg}
            />
          ),
        }}
      />
    </Tabs>
  );
}
