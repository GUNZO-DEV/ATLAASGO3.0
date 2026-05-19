import { MotiView } from 'moti';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, MapPin, Navigation, Phone } from 'lucide-react-native';
import { PressableScale } from '../../components/primitives/PressableScale';
import { Pulse } from '../../components/primitives/Pulse';
import { useOrderStatus } from '../../hooks/useOrderStatus';
import { useAdvanceOrder } from '../../hooks/useAdvanceOrder';
import { ORDER_STAGES, type OrderStage } from '../../lib/types';
import { STAGE_LABELS } from '../../lib/theme';

const NEXT_STAGE_CTA: Record<OrderStage, string | null> = {
  ordered: 'Accept order',
  preparing: 'Heading out',
  enRoute: 'Picked up · out for delivery',
  outForDelivery: "I'm arriving",
  arriving: null,
};

export default function DriverAssignment() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { order, stage, loading } = useOrderStatus(id);
  const { advanceFrom, pending } = useAdvanceOrder(id);

  const cta = NEXT_STAGE_CTA[stage];
  const stageIndex = ORDER_STAGES.indexOf(stage);
  const progressPct = ((stageIndex + 1) / ORDER_STAGES.length) * 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0A07' }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 240 }}
          className="flex-row items-center justify-between pt-3"
        >
          <PressableScale onPress={() => router.back()}>
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            >
              <ArrowLeft size={18} color="#FBF7F2" />
            </View>
          </PressableScale>
          <View className="flex-row items-center">
            <Pulse color="#34D399" size={8} />
            <Text
              className="ml-1 text-[10px] uppercase font-bold"
              style={{ letterSpacing: 1.5, color: '#34D399' }}
            >
              Driver · Live
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </MotiView>

        {/* Assignment header — the field the entire spec hinges on */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 380, delay: 100 }}
          className="mt-6 rounded-3xl p-6"
          style={{
            backgroundColor: '#17110C',
            borderWidth: 1,
            borderColor: 'rgba(255,87,34,0.25)',
            shadowColor: '#FF5722',
            shadowOffset: { width: 0, height: 18 },
            shadowOpacity: 0.3,
            shadowRadius: 40,
            elevation: 12,
          }}
        >
          <View className="flex-row items-center mb-3">
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: '#FF5722' }}
            >
              <MapPin size={16} color="#fff" strokeWidth={2.5} />
            </View>
            <Text
              className="ml-2.5 text-[10px] uppercase font-bold"
              style={{ letterSpacing: 1.6, color: '#FF8A65' }}
            >
              Drop landmark
            </Text>
          </View>
          {loading ? (
            <Text style={{ color: '#7A6F66', fontSize: 14 }}>Loading assignment…</Text>
          ) : (
            <>
              <Text
                className="font-display"
                style={{
                  color: '#FBF7F2',
                  fontWeight: '800',
                  fontSize: 24,
                  letterSpacing: -0.6,
                  lineHeight: 28,
                }}
              >
                {order?.driverPayload?.headerLandmark ?? '—'}
              </Text>
              <View className="flex-row items-center mt-4">
                <Navigation size={14} color="#FF8A65" />
                <Text
                  className="ml-1.5 font-mono text-[12px]"
                  style={{ color: '#FBF7F2', opacity: 0.85 }}
                >
                  {order
                    ? `${(order.coords?.lat ?? 0).toFixed(5)}, ${(order.coords?.lng ?? 0).toFixed(5)}`
                    : 'awaiting GPS'}
                </Text>
                {order?.coords?.accuracyM != null && (
                  <Text className="ml-2 text-[11px]" style={{ color: '#7A6F66' }}>
                    ±{Math.round(order.coords.accuracyM)} m
                  </Text>
                )}
              </View>
              {order?.driverPayload?.deliveryNotes ? (
                <View
                  className="mt-4 rounded-2xl p-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  <Text
                    className="text-[10px] uppercase font-bold mb-1"
                    style={{ letterSpacing: 1.4, color: '#7A6F66' }}
                  >
                    Notes
                  </Text>
                  <Text style={{ color: '#FBF7F2', fontSize: 13, lineHeight: 18 }}>
                    {order.driverPayload.deliveryNotes}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </MotiView>

        {/* Order facts */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 380, delay: 160 }}
          className="mt-5 flex-row"
        >
          <View
            className="flex-1 rounded-2xl p-4 mr-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            <Text
              className="text-[10px] uppercase font-bold"
              style={{ letterSpacing: 1.4, color: '#7A6F66' }}
            >
              Category
            </Text>
            <Text
              className="font-display mt-1.5 text-[18px]"
              style={{ color: '#FBF7F2', fontWeight: '700', textTransform: 'capitalize' }}
            >
              {order?.category ?? '—'}
            </Text>
          </View>
          <View
            className="flex-1 rounded-2xl p-4 ml-2"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            <Text
              className="text-[10px] uppercase font-bold"
              style={{ letterSpacing: 1.4, color: '#7A6F66' }}
            >
              Fare
            </Text>
            <Text
              className="font-display mt-1.5 text-[18px]"
              style={{ color: '#FF8A65', fontWeight: '800' }}
            >
              {order?.totalDh ?? 0} dh
            </Text>
          </View>
        </MotiView>

        {/* Stage progress + current label */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 380, delay: 220 }}
          className="mt-6"
        >
          <View className="flex-row justify-between items-baseline mb-2">
            <Text
              className="text-[10px] uppercase font-bold"
              style={{ letterSpacing: 1.6, color: '#FF8A65' }}
            >
              Current stage
            </Text>
            <Text
              className="font-mono text-[11px]"
              style={{ color: '#7A6F66' }}
            >
              {stageIndex + 1} / {ORDER_STAGES.length}
            </Text>
          </View>
          <Text
            className="font-display"
            style={{ color: '#FBF7F2', fontWeight: '800', fontSize: 22, letterSpacing: -0.4 }}
          >
            {STAGE_LABELS[stage].title}
          </Text>
          <Text className="mt-1 text-[13px]" style={{ color: '#7A6F66' }}>
            {STAGE_LABELS[stage].subtitle}
          </Text>

          {/* Progress bar */}
          <View
            className="mt-4 rounded-full overflow-hidden"
            style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            <MotiView
              animate={{ width: `${progressPct}%` }}
              transition={{ type: 'timing', duration: 600 }}
              style={{
                height: '100%',
                backgroundColor: '#FF5722',
                borderRadius: 999,
                shadowColor: '#FF5722',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 4,
              }}
            />
          </View>
        </MotiView>

        {/* Customer contact strip */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 380, delay: 280 }}
          className="mt-6 rounded-2xl p-4 flex-row items-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: '#FFB74D' }}
          >
            <Text className="font-display" style={{ color: '#1A1410', fontWeight: '800' }}>
              {(order?.customerId ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <Text
              className="text-[10px] uppercase font-bold"
              style={{ letterSpacing: 1.4, color: '#7A6F66' }}
            >
              Customer
            </Text>
            <Text className="mt-0.5 font-display" style={{ color: '#FBF7F2', fontWeight: '700' }}>
              {order?.customerId ?? '—'}
            </Text>
          </View>
          <PressableScale>
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: '#FF5722' }}
            >
              <Phone size={16} color="#fff" />
            </View>
          </PressableScale>
        </MotiView>
      </ScrollView>

      {/* Sticky advance CTA */}
      <MotiView
        from={{ translateY: 80, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'timing', duration: 360, delay: 320 }}
        style={{ position: 'absolute', left: 24, right: 24, bottom: 32 }}
      >
        {cta ? (
          <PressableScale onPress={() => advanceFrom(stage)} disabled={pending}>
            <View
              className="rounded-full py-4 px-6 flex-row items-center justify-center"
              style={{
                backgroundColor: '#FF5722',
                shadowColor: '#FF5722',
                shadowOffset: { width: 0, height: 14 },
                shadowOpacity: 0.45,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              <Text className="text-white font-bold text-[15px] mr-2" style={{ letterSpacing: 0.2 }}>
                {pending ? 'Updating…' : cta}
              </Text>
              <ArrowRight size={16} color="#fff" strokeWidth={2.5} />
            </View>
          </PressableScale>
        ) : (
          <View
            className="rounded-full py-4 px-6 items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <Text className="text-white font-bold text-[14px]" style={{ letterSpacing: 0.2, opacity: 0.6 }}>
              Order complete · awaiting handoff
            </Text>
          </View>
        )}
      </MotiView>
    </SafeAreaView>
  );
}
