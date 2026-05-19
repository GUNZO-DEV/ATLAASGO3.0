import { MotiView } from 'moti';
import { Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Pulse } from './primitives/Pulse';
import { STAGE_LABELS } from '../lib/theme';
import type { OrderStage } from '../lib/types';

type Status = 'done' | 'current' | 'pending';

export function ProgressSegment({
  stage,
  status,
  index,
}: {
  stage: OrderStage;
  status: Status;
  index: number;
}) {
  const isDone = status === 'done';
  const isCurrent = status === 'current';
  const label = STAGE_LABELS[stage];

  return (
    <MotiView
      from={{ opacity: 0, translateX: -12 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 320, delay: 120 + index * 70 }}
      className="flex-row items-center pl-1 pr-2 py-3"
    >
      <View style={{ width: 44, alignItems: 'center', justifyContent: 'center' }}>
        {isCurrent ? (
          <Pulse color="#FF5722" size={14} />
        ) : (
          <MotiView
            animate={{
              scale: isDone ? 1 : 0.9,
              backgroundColor: isDone ? '#FF5722' : 'transparent',
              borderColor: isDone ? '#FF5722' : 'rgba(26,20,16,0.15)',
            }}
            transition={{ type: 'timing', duration: 280 }}
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              borderWidth: 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isDone ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
          </MotiView>
        )}
      </View>

      <View className="flex-1 pl-3">
        <MotiView
          animate={{
            opacity: status === 'pending' ? 0.45 : 1,
            translateX: isCurrent ? 2 : 0,
          }}
          transition={{ type: 'timing', duration: 260 }}
        >
          <Text
            className="font-display text-[15px]"
            style={{
              fontWeight: '700',
              color: isCurrent ? '#FF5722' : status === 'pending' ? '#7A6F66' : '#1A1410',
              letterSpacing: -0.3,
            }}
          >
            {label.title}
          </Text>
          <Text
            className="text-[12px] mt-0.5"
            style={{ color: '#7A6F66', opacity: status === 'pending' ? 0.7 : 1 }}
          >
            {label.subtitle}
          </Text>
        </MotiView>
      </View>
    </MotiView>
  );
}
