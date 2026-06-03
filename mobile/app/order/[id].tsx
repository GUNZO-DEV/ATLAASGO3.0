import { MotiView } from 'moti';
import { useEffect } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Bike, MapPin, Phone } from 'lucide-react-native';
import { ProgressTimeline } from '../../components/ProgressTimeline';
import { PressableScale } from '../../components/primitives/PressableScale';
import { useDemoOrderProgress, useOrderStatus } from '../../hooks/useOrderStatus';
import { useAssignedRider } from '../../hooks/useAssignedRider';
import { ORDER_STAGES } from '../../lib/types';

export default function OrderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isDemo = !id || id.startsWith('demo-');

  const { order, stage: liveStage } = useOrderStatus(isDemo ? undefined : id);
  const { stage: demoStage } = useDemoOrderProgress('ordered');
  const stage = isDemo ? demoStage : liveStage;
  const { rider } = useAssignedRider(isDemo ? undefined : id);

  // Avoid unused-var TS noise
  useEffect(() => {
    /* no-op */
  }, [order]);

  const headerLandmark = order?.driverPayload?.headerLandmark ?? 'Near the Grand Mosque';
  const eta = Math.max(
    0,
    (ORDER_STAGES.length - 1 - ORDER_STAGES.indexOf(stage)) * 4,
  );

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
            Order #{(id ?? '—').slice(0, 6).toUpperCase()}
          </Text>
          <View style={{ width: 40 }} />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 100 }}
          className="mt-6"
        >
          <Text
            className="font-display text-[30px]"
            style={{ fontWeight: '800', letterSpacing: -1.0, lineHeight: 32, color: '#1A1410' }}
          >
            {stage === 'arriving' ? 'Almost there.' : 'On its way.'}
          </Text>
          <Text className="mt-2 text-[14px]" style={{ color: '#7A6F66' }}>
            {stage === 'arriving' ? 'Heads up — your driver is at your landmark.' : `ETA ~ ${eta} min`}
          </Text>
        </MotiView>

        {/* Driver landmark strip — mirrors driverPayload.headerLandmark */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 160 }}
          className="mt-6 rounded-2xl p-4 flex-row items-center"
          style={{
            backgroundColor: '#FFF1EB',
            borderWidth: 1,
            borderColor: 'rgba(255,87,34,0.15)',
          }}
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: '#FF5722' }}
          >
            <MapPin size={16} color="#fff" strokeWidth={2.5} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[10px] uppercase font-bold" style={{ letterSpacing: 1.2, color: '#7A6F66' }}>
              Driver header
            </Text>
            <Text className="text-[14px] font-bold mt-0.5" style={{ color: '#1A1410' }}>
              {headerLandmark}
            </Text>
          </View>
        </MotiView>

        <View className="mt-6">
          <ProgressTimeline stage={stage} />
        </View>

        {/* Rider card — real assigned rider, or a finding-your-rider state */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 360, delay: 280 }}
          className="mt-6 rounded-3xl bg-white p-5 flex-row items-center"
          style={{
            borderWidth: 1,
            borderColor: 'rgba(26,20,16,0.08)',
          }}
        >
          {rider ? (
            <>
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: '#FFB74D' }}
              >
                <Text className="text-white font-display text-lg" style={{ fontWeight: '800' }}>
                  {rider.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-display text-[15px]" style={{ fontWeight: '700' }} numberOfLines={1}>
                  {rider.name}
                </Text>
                <Text className="text-[12px] mt-0.5" style={{ color: '#7A6F66' }} numberOfLines={1}>
                  {[rider.vehicle, rider.plate, rider.rating != null ? `${rider.rating} ★` : null]
                    .filter(Boolean)
                    .join(' · ') || 'On the way'}
                </Text>
              </View>
              {rider.phone ? (
                <PressableScale onPress={() => Linking.openURL(`tel:${rider.phone}`)}>
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: '#1A1410' }}
                  >
                    <Phone size={16} color="#fff" />
                  </View>
                </PressableScale>
              ) : null}
            </>
          ) : (
            <>
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(26,20,16,0.06)' }}
              >
                <Bike size={20} color="#7A6F66" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-display text-[15px]" style={{ fontWeight: '700', color: '#1A1410' }}>
                  Finding your rider…
                </Text>
                <Text className="text-[12px] mt-0.5" style={{ color: '#7A6F66' }}>
                  We’ll assign the nearest available rider.
                </Text>
              </View>
            </>
          )}
        </MotiView>

        {!isDemo && __DEV__ && (
          <MotiView
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 360, delay: 360 }}
            className="mt-6"
          >
            <PressableScale onPress={() => router.push({ pathname: '/driver/[id]', params: { id: id! } })}>
              <View
                className="rounded-2xl px-4 py-3 flex-row items-center justify-between"
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(26,20,16,0.10)',
                  borderStyle: 'dashed',
                  backgroundColor: 'rgba(26,20,16,0.02)',
                }}
              >
                <View className="flex-row items-center flex-1">
                  <Bike size={14} color="#7A6F66" />
                  <Text
                    className="ml-2 text-[11px] uppercase font-bold"
                    style={{ letterSpacing: 1.2, color: '#7A6F66' }}
                  >
                    Dev · view as driver
                  </Text>
                </View>
                <Text className="text-[12px] font-bold" style={{ color: '#FF5722' }}>
                  Open →
                </Text>
              </View>
            </PressableScale>
          </MotiView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
