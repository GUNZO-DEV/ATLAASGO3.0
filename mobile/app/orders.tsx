import { MotiView } from 'moti';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Bike, User } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useOrdersList } from '../hooks/useOrdersList';
import { STAGE_LABELS } from '../lib/theme';

const STATUS_COLOR: Record<string, string> = {
  ordered: '#7A6F66',
  preparing: '#FF8A65',
  enRoute: '#FFB74D',
  outForDelivery: '#34D399',
  arriving: '#FF5722',
};

/**
 * Dev-only orders index. Lets a reviewer flip between the customer view and
 * the driver view for the same order so the live-update loop is demonstrable
 * without two devices.
 */
export default function OrdersIndex() {
  const router = useRouter();
  const { orders, loading } = useOrdersList(20);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateX: -8 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 240 }}
          className="flex-row items-center justify-between pt-3"
        >
          <PressableScale onPress={() => router.replace('/')}>
            <View
              className="w-10 h-10 rounded-full items-center justify-center bg-white"
              style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
            >
              <ArrowLeft size={18} color="#1A1410" />
            </View>
          </PressableScale>
          <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: '#FF5722' }}>
            Dev · Orders
          </Text>
          <View style={{ width: 40 }} />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 100 }}
          className="mt-6 mb-5"
        >
          <Text
            className="font-display text-[28px]"
            style={{ fontWeight: '800', letterSpacing: -0.8, color: '#1A1410', lineHeight: 32 }}
          >
            Live orders
          </Text>
          <Text className="mt-2 text-[14px]" style={{ color: '#7A6F66', lineHeight: 20 }}>
            Open as customer to watch the timeline, or as driver to advance the order.
            Updates stream in real-time across both views.
          </Text>
        </MotiView>

        {loading && (
          <Text className="text-[13px]" style={{ color: '#7A6F66' }}>Loading…</Text>
        )}
        {!loading && orders.length === 0 && (
          <View
            className="rounded-3xl p-6"
            style={{ backgroundColor: '#FFF1EB', borderWidth: 1, borderColor: 'rgba(255,87,34,0.15)' }}
          >
            <Text
              className="font-display text-[16px]"
              style={{ fontWeight: '700', color: '#1A1410' }}
            >
              No orders yet
            </Text>
            <Text className="mt-1 text-[13px]" style={{ color: '#7A6F66', lineHeight: 18 }}>
              Make sure your Firestore emulator is running and the seed has been run
              (`cd backend && npm run seed`), or place a new order from Home.
            </Text>
          </View>
        )}

        {orders.map((o, i) => {
          const color = STATUS_COLOR[o.status] ?? '#7A6F66';
          return (
            <MotiView
              key={o.id}
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 320, delay: 80 + i * 60 }}
              className="rounded-3xl mb-3 bg-white"
              style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
            >
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-3">
                  <Text
                    className="font-mono text-[11px]"
                    style={{ color: '#7A6F66' }}
                  >
                    {o.id.slice(0, 12).toUpperCase()}
                  </Text>
                  <View
                    className="rounded-full px-2.5 py-1 flex-row items-center"
                    style={{ backgroundColor: `${color}1A` }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: color,
                        marginRight: 6,
                      }}
                    />
                    <Text
                      className="text-[10px] font-bold uppercase"
                      style={{ color, letterSpacing: 1 }}
                    >
                      {STAGE_LABELS[o.status]?.title ?? o.status}
                    </Text>
                  </View>
                </View>
                <Text
                  className="font-display text-[16px]"
                  style={{ fontWeight: '700', color: '#1A1410' }}
                >
                  {o.driverPayload?.headerLandmark ?? o.landmark}
                </Text>
                <Text className="mt-1 text-[12px]" style={{ color: '#7A6F66', textTransform: 'capitalize' }}>
                  {o.category} · {o.totalDh} dh · customer {o.customerId}
                </Text>
                <View className="flex-row mt-4">
                  <Pressable
                    onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })}
                    className="flex-1 mr-2"
                  >
                    <View
                      className="rounded-full py-2.5 px-3 flex-row items-center justify-center"
                      style={{
                        backgroundColor: 'rgba(26,20,16,0.06)',
                      }}
                    >
                      <User size={13} color="#1A1410" />
                      <Text
                        className="text-[12px] font-bold ml-1.5"
                        style={{ color: '#1A1410', letterSpacing: 0.2 }}
                      >
                        Customer view
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push({ pathname: '/driver/[id]', params: { id: o.id } })}
                    className="flex-1 ml-2"
                  >
                    <View
                      className="rounded-full py-2.5 px-3 flex-row items-center justify-center"
                      style={{
                        backgroundColor: '#1A1410',
                      }}
                    >
                      <Bike size={13} color="#fff" />
                      <Text
                        className="text-[12px] font-bold ml-1.5"
                        style={{ color: '#fff', letterSpacing: 0.2 }}
                      >
                        Driver view
                      </Text>
                      <ArrowRight size={12} color="#FF8A65" style={{ marginLeft: 4 }} />
                    </View>
                  </Pressable>
                </View>
              </View>
            </MotiView>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
