import { MotiView } from 'moti';
import { useState, type ReactNode } from 'react';
import { Pressable, type ViewStyle } from 'react-native';

/**
 * Standalone scale-on-tap wrapper for buttons/CTAs that don't need
 * neighbour-recede behaviour (use CategoryGrid for that).
 */
export function PressableScale({
  children,
  onPress,
  disabled,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={style}
    >
      <MotiView
        animate={{ scale: pressed ? 0.97 : 1, opacity: disabled ? 0.5 : 1 }}
        transition={{ type: 'timing', duration: 180 }}
      >
        {children}
      </MotiView>
    </Pressable>
  );
}
