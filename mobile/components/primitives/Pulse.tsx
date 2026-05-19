import { MotiView } from 'moti';
import { View } from 'react-native';

/**
 * Soft pulsing ring used to mark the active stage on the progress timeline.
 * Renders a static dot underneath a radial expand-and-fade ring.
 */
export function Pulse({ color = '#FF5722', size = 14 }: { color?: string; size?: number }) {
  return (
    <View style={{ width: size * 2.4, height: size * 2.4, alignItems: 'center', justifyContent: 'center' }}>
      <MotiView
        from={{ opacity: 0.55, scale: 0.8 }}
        animate={{ opacity: 0, scale: 2.2 }}
        transition={{ type: 'timing', duration: 1600, loop: true, repeatReverse: false }}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
        }}
      />
      <MotiView
        from={{ scale: 0.92 }}
        animate={{ scale: 1.04 }}
        transition={{ type: 'timing', duration: 900, loop: true, repeatReverse: true }}
        style={{
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 6,
        }}
      />
    </View>
  );
}
