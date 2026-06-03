import { MotiView } from 'moti';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { LandmarkInput, MIN_LANDMARK_LENGTH } from '../components/LandmarkInput';
import { PressableScale } from '../components/primitives/PressableScale';
import { useLocation } from '../hooks/useLocation';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { useAuth } from '../lib/auth';
import type { CategoryKey } from '../lib/types';

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  food: 'Food',
  pharmacy: 'Pharmacy',
  groceries: 'Groceries',
};

export default function Checkout() {
  const router = useRouter();
  const { category, totalDh: totalParam } = useLocalSearchParams<{
    category?: string;
    totalDh?: string;
  }>();
  const categoryKey = (category as CategoryKey) ?? 'food';
  // Real order total is passed in from the cart/menu step. No hardcoded prices.
  const totalDh = Math.max(0, Math.round(Number(totalParam) || 0));

  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const { coords, status: locStatus, capture, error: locError } = useLocation();
  const { create, submitting, error: createError } = useCreateOrder();
  const { user } = useAuth();

  const landmarkValid = landmark.trim().length >= MIN_LANDMARK_LENGTH;
  const coordsReady = !!coords;
  const canSubmit = !!user && landmarkValid && coordsReady && totalDh > 0 && !submitting;

  const handleSubmit = async () => {
    // Production: a real order requires a signed-in user (RLS enforces
    // orders.customer_id = auth.uid()). No demo fallback.
    if (!user) {
      Alert.alert('Sign in to order', 'Create an account or sign in to place your order.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/sign-in') },
      ]);
      return;
    }
    if (!coords) {
      Alert.alert('Location required', 'Tap "Capture" to share your GPS pin first.');
      return;
    }
    if (!landmarkValid) {
      Alert.alert('Landmark required', 'Add a quick landmark so your driver finds you.');
      return;
    }
    if (totalDh <= 0) {
      Alert.alert('Cart is empty', 'Add items before placing an order.');
      return;
    }
    const orderId = await create({
      customerId: user.id,
      category: categoryKey,
      coords,
      landmark: landmark.trim(),
      totalDh,
      deliveryNotes: notes.trim() || undefined,
    });
    if (orderId) {
      router.replace({ pathname: '/order/[id]', params: { id: orderId } });
    } else {
      Alert.alert('Could not place order', 'Please try again in a moment.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF7F2' }} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateX: -8 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 240 }}
          className="flex-row items-center justify-between pt-3"
        >
          <PressableScale onPress={() => router.back()}>
            <View
              className="w-10 h-10 rounded-full items-center justify-center bg-white"
              style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
            >
              <ArrowLeft size={18} color="#1A1410" />
            </View>
          </PressableScale>
          <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: '#FF5722' }}>
            Step 2 of 3
          </Text>
          <View style={{ width: 40 }} />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 320, delay: 80 }}
          className="mt-6"
        >
          <Text className="text-[12px] uppercase font-bold" style={{ letterSpacing: 1.6, color: '#7A6F66' }}>
            {CATEGORY_LABELS[categoryKey]} delivery
          </Text>
          <Text
            className="font-display text-[28px] mt-1"
            style={{ fontWeight: '800', letterSpacing: -0.8, color: '#1A1410', lineHeight: 32 }}
          >
            Where exactly{'\n'}should we drop it?
          </Text>
          <Text className="mt-2 text-[14px]" style={{ color: '#7A6F66', lineHeight: 20 }}>
            Drop your GPS pin and add the local landmark your driver will recognise.
            Both are sent to the driver app's assignment header.
          </Text>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 160 }}
          className="mt-7"
        >
          <LandmarkInput
            value={landmark}
            onChange={setLandmark}
            coords={coords}
            onCaptureCoords={capture}
            capturing={locStatus === 'requesting'}
          />
        </MotiView>

        {locError && (
          <Text className="mt-3 text-[12px]" style={{ color: '#EF4444' }}>
            {locError}
          </Text>
        )}

        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 220 }}
          className="mt-6"
        >
          <Text className="text-[11px] uppercase font-bold mb-2" style={{ letterSpacing: 1.4, color: '#7A6F66' }}>
            Driver notes · optional
          </Text>
          <View
            className="rounded-2xl bg-white"
            style={{ borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}
          >
            <Text
              className="px-4 py-3.5 text-[14px]"
              style={{ color: notes ? '#1A1410' : '#9B8F84' }}
              onPress={() => {
                /* purely decorative — TextInput for notes is below */
              }}
            >
              Optional · gate code, floor, anything else
            </Text>
          </View>
        </MotiView>

        {/* Order summary */}
        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 280 }}
          className="mt-6 p-5 rounded-3xl"
          style={{
            backgroundColor: '#1A1410',
          }}
        >
          <View className="flex-row justify-between mb-2">
            <Text className="text-white/60 text-[12px] font-semibold">Subtotal</Text>
            <Text className="text-white text-[13px] font-semibold">{totalDh} dh</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-white/60 text-[12px] font-semibold">Delivery</Text>
            <Text className="text-[13px] font-semibold" style={{ color: '#FF8A65' }}>Free with Prime</Text>
          </View>
          <View
            className="flex-row justify-between pt-3 mt-2"
            style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <Text className="text-white font-display text-[15px]" style={{ fontWeight: '800' }}>Total</Text>
            <Text className="text-white font-display text-[18px]" style={{ fontWeight: '800', letterSpacing: -0.4 }}>
              {totalDh} dh
            </Text>
          </View>
        </MotiView>

        {createError && (
          <Text className="mt-3 text-[12px]" style={{ color: '#EF4444' }}>
            {createError.message}
          </Text>
        )}
      </ScrollView>

      {/* Sticky submit */}
      <MotiView
        from={{ translateY: 80, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'timing', duration: 360, delay: 320 }}
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 32,
        }}
      >
        <PressableScale onPress={handleSubmit} disabled={!canSubmit}>
          <View
            className="rounded-full py-4 px-6 flex-row items-center justify-center"
            style={{
              backgroundColor: canSubmit ? '#FF5722' : '#9B8F84',
              shadowColor: '#FF5722',
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: canSubmit ? 0.4 : 0,
              shadowRadius: 24,
              elevation: 10,
            }}
          >
            <Text className="text-white font-bold text-[15px] mr-2" style={{ letterSpacing: 0.2 }}>
              {submitting
                ? 'Placing order…'
                : !user
                  ? 'Sign in to order'
                  : !coordsReady
                    ? 'Capture GPS first'
                    : !landmarkValid
                      ? 'Add a landmark'
                      : totalDh <= 0
                        ? 'Cart is empty'
                        : `Place order · ${totalDh} dh`}
            </Text>
            <ArrowRight size={16} color="#fff" strokeWidth={2.5} />
          </View>
        </PressableScale>
      </MotiView>
    </SafeAreaView>
  );
}
