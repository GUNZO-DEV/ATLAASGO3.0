import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react-native';
import { PressableScale } from '../components/primitives/PressableScale';
import { useCart } from '../lib/cart';

export default function CartScreen() {
  const router = useRouter();
  const { items, setQty, remove, clear, subtotal, deliveryFee, serviceFee, total } = useCart();

  function Header() {
    return (
      <View className="flex-row items-center justify-between pt-3">
        <PressableScale onPress={() => router.back()}>
          <View
            className="w-10 h-10 rounded-full items-center justify-center bg-white"
            style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
          >
            <ArrowLeft size={18} color="#1A1410" />
          </View>
        </PressableScale>
        <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: '#FF5722' }}>
          Your cart
        </Text>
        {items.length > 0 ? (
          <PressableScale onPress={clear}>
            <View className="w-10 h-10 rounded-full items-center justify-center">
              <Trash2 size={17} color="#7A6F66" />
            </View>
          </PressableScale>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
        <View className="flex-1 px-6">
          <Header />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
            <ShoppingBag size={30} color="#7A6F66" />
            <Text style={{ fontWeight: '800', fontSize: 20, color: '#1A1410', marginTop: 16 }}>
              Your cart is empty
            </Text>
            <Text style={{ fontSize: 14, color: '#7A6F66', textAlign: 'center', lineHeight: 20, marginTop: 8 }}>
              Add items from a restaurant to get started.
            </Text>
            <PressableScale onPress={() => router.replace('/')}>
              <View style={{ backgroundColor: '#FF5722', borderRadius: 999, paddingVertical: 14, paddingHorizontal: 30, marginTop: 24 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Browse restaurants</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const restaurantName = items[0]?.restaurantName;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
      >
        <Header />

        <View className="mt-6 mb-5">
          <Text
            className="font-display text-[28px]"
            style={{ fontWeight: '800', letterSpacing: -0.8, color: '#1A1410', lineHeight: 32 }}
          >
            Your cart
          </Text>
          {restaurantName ? (
            <Text className="mt-2 text-[14px]" style={{ color: '#7A6F66' }}>
              From {restaurantName}
            </Text>
          ) : null}
        </View>

        {/* Line items */}
        <View style={{ gap: 10 }}>
          {items.map((item) => (
            <View
              key={item.id}
              className="flex-row items-center bg-white rounded-2xl p-4"
              style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.07)' }}
            >
              <View className="flex-1 pr-3">
                <Text className="text-[15px] font-bold" style={{ color: '#1A1410' }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-[13px] font-bold mt-1" style={{ color: '#7A6F66' }}>
                  {item.priceDh} dh
                </Text>
              </View>
              {/* qty stepper */}
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <PressableScale onPress={() => setQty(item.id, item.qty - 1)}>
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}
                  >
                    <Minus size={15} color="#1A1410" strokeWidth={2.5} />
                  </View>
                </PressableScale>
                <Text className="text-[15px] font-bold" style={{ color: '#1A1410', minWidth: 20, textAlign: 'center' }}>
                  {item.qty}
                </Text>
                <PressableScale onPress={() => setQty(item.id, item.qty + 1)}>
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: '#FF5722' }}
                  >
                    <Plus size={15} color="#fff" strokeWidth={2.5} />
                  </View>
                </PressableScale>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View className="mt-6 p-5 rounded-3xl" style={{ backgroundColor: '#1A1410' }}>
          <Row label="Subtotal" value={`${subtotal()} dh`} />
          <Row label="Delivery" value={`${deliveryFee()} dh`} />
          <Row label="Service fee" value={`${serviceFee()} dh`} />
          <View
            className="flex-row justify-between pt-3 mt-2"
            style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <Text className="text-white font-display text-[15px]" style={{ fontWeight: '800' }}>Total</Text>
            <Text className="text-white font-display text-[18px]" style={{ fontWeight: '800', letterSpacing: -0.4 }}>
              {total()} dh
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky checkout */}
      <View style={{ position: 'absolute', left: 24, right: 24, bottom: 32 }}>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/checkout', params: { category: 'food', totalDh: String(total()) } })
          }
        >
          <View
            className="rounded-full py-4 px-6 flex-row items-center justify-center"
            style={{
              backgroundColor: '#FF5722',
              shadowColor: '#FF5722',
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: 0.4,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            <Text className="text-white font-bold text-[15px] mr-2">Checkout · {total()} dh</Text>
            <ArrowRight size={16} color="#fff" strokeWidth={2.5} />
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between mb-2">
      <Text className="text-white/60 text-[12px] font-semibold">{label}</Text>
      <Text className="text-white text-[13px] font-semibold">{value}</Text>
    </View>
  );
}
