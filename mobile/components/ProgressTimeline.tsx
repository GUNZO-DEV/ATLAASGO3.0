import { MotiView } from 'moti';
import { Text, View } from 'react-native';
import { ProgressSegment } from './ProgressSegment';
import { ORDER_STAGES, type OrderStage } from '../lib/types';

const ACTIVE_HEIGHT = 64;
const SEGMENT_GAP = 4;

/**
 * 5-segment delivery status tracker. The connector lines between segments
 * fill up as stages complete; the active segment is marked with a pulsing
 * ring (see Pulse primitive).
 *
 * Layout animation: when `stage` changes, the fill height interpolates
 * smoothly to its new value via Moti's timing transition.
 */
export function ProgressTimeline({ stage }: { stage: OrderStage }) {
  const activeIndex = ORDER_STAGES.indexOf(stage);

  return (
    <View
      className="bg-white rounded-3xl p-6 pb-2"
      style={{
        borderWidth: 1,
        borderColor: 'rgba(26,20,16,0.08)',
        shadowColor: '#1A1410',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
      }}
    >
      <View className="flex-row items-baseline justify-between mb-2">
        <Text
          className="font-display text-xl"
          style={{ fontWeight: '800', letterSpacing: -0.4 }}
        >
          Live status
        </Text>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 400, delay: 200 }}
        >
          <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.5, color: '#FF5722' }}>
            {activeIndex === ORDER_STAGES.length - 1 ? 'Arriving' : 'Live'}
          </Text>
        </MotiView>
      </View>

      {/* Track + segments */}
      <View>
        {/* Track background line (full height) */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 22,
            top: 24,
            bottom: 24,
            width: 2,
            backgroundColor: 'rgba(26,20,16,0.08)',
            borderRadius: 1,
          }}
        />
        {/* Animated progress fill */}
        <MotiView
          pointerEvents="none"
          animate={{
            height:
              activeIndex <= 0
                ? 0
                : activeIndex * (ACTIVE_HEIGHT + SEGMENT_GAP) - 6,
          }}
          transition={{ type: 'timing', duration: 600 }}
          style={{
            position: 'absolute',
            left: 22,
            top: 30,
            width: 2,
            backgroundColor: '#FF5722',
            borderRadius: 1,
            shadowColor: '#FF5722',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 4,
          }}
        />

        {ORDER_STAGES.map((s, i) => {
          const status = i < activeIndex ? 'done' : i === activeIndex ? 'current' : 'pending';
          return <ProgressSegment key={s} stage={s} status={status} index={i} />;
        })}
      </View>
    </View>
  );
}
