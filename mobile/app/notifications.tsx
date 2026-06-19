import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, ChevronRight, Package, Tag, Wallet, MessageCircle, Bike, Star } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useAuth } from '../lib/auth';
import { useNotifications } from '../hooks/useNotifications';

const INK = '#1A1410';
const MUTED = '#7A6F66';
const BRAND = '#FF5722';

function iconFor(kind: string) {
  switch (kind) {
    case 'order_status': return { Icon: Package, color: '#FF5722' };
    case 'promo': return { Icon: Tag, color: '#C66B1F' };
    case 'wallet': return { Icon: Wallet, color: '#059669' };
    case 'chat_message': return { Icon: MessageCircle, color: '#2563EB' };
    case 'rider_assignment': return { Icon: Bike, color: '#FF5722' };
    case 'review_request': return { Icon: Star, color: '#C66B1F' };
    default: return { Icon: Bell, color: MUTED };
  }
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, unread, loading, markRead, markAllRead } = useNotifications();

  function Header() {
    return (
      <View className="flex-row items-center justify-between pt-3 px-6">
        <PressableScale onPress={() => router.back()}>
          <View className="w-10 h-10 rounded-full items-center justify-center bg-white" style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}>
            <ArrowLeft size={18} color={INK} />
          </View>
        </PressableScale>
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: BRAND }}>Notifications</Text>
        {unread > 0 ? (
          <Pressable onPress={markAllRead}>
            <Text className="text-[12px] font-bold" style={{ color: BRAND }}>Read all</Text>
          </Pressable>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>
    );
  }

  if (!authLoading && !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <Header />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Bell size={30} color={MUTED} />
          <Text style={{ fontWeight: '800', fontSize: 20, color: INK, marginTop: 16 }}>Notifications</Text>
          <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
            Sign in to see order updates and promos.
          </Text>
          <PressableScale onPress={() => router.push('/sign-in')}>
            <View style={{ backgroundColor: BRAND, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Sign in</Text>
            </View>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <Header />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 18 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="py-10 items-center"><ActivityIndicator color={BRAND} /></View>
        ) : items.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Bell size={28} color={MUTED} />
            <Text style={{ fontWeight: '700', fontSize: 16, color: INK, marginTop: 14 }}>You’re all caught up</Text>
            <Text style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Order updates will appear here.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {items.map((n) => {
              const { Icon, color } = iconFor(n.kind);
              // Notifications about an order carry payload.orderId — tapping
              // them opens live tracking (and still marks the row as read).
              const orderId = n.payload?.orderId;
              const linkedOrderId = typeof orderId === 'string' || typeof orderId === 'number' ? String(orderId) : null;
              return (
                <Pressable
                  key={n.id}
                  onPress={() => {
                    if (!n.readAt) void markRead(n.id);
                    if (linkedOrderId) {
                      router.push({ pathname: '/order/[id]', params: { id: linkedOrderId } });
                    }
                  }}
                >
                  <View
                    className="flex-row p-4 rounded-2xl"
                    style={{
                      backgroundColor: n.readAt ? '#fff' : '#FFF1EB',
                      borderWidth: 1,
                      borderColor: n.readAt ? 'rgba(26,20,16,0.07)' : 'rgba(255,87,34,0.18)',
                    }}
                  >
                    <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: `${color}1A` }}>
                      <Icon size={16} color={color} />
                    </View>
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[14px] font-bold flex-1" style={{ color: INK }} numberOfLines={1}>{n.title}</Text>
                        <Text className="text-[11px] ml-2" style={{ color: MUTED }}>{timeAgo(n.createdAt)}</Text>
                      </View>
                      {n.body ? (
                        <Text className="text-[13px] mt-0.5" style={{ color: MUTED, lineHeight: 18 }}>{n.body}</Text>
                      ) : null}
                    </View>
                    {linkedOrderId ? (
                      <View className="justify-center ml-2">
                        <ChevronRight size={15} color={MUTED} />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
