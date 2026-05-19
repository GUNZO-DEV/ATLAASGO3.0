import { MotiView } from 'moti';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { MapPin, Sparkles } from 'lucide-react-native';
import type { Coords } from '../hooks/useLocation';

const SUGGESTIONS = [
  'Near the Grand Mosque',
  'Behind the Telecom Shop',
  'Across from Café Hassan',
  'Next to the AUI gate',
  'Near the Michlifen pharmacy',
];

const MIN_LANDMARK_LENGTH = 3;

/**
 * Mandatory free-text landmark input. Validates min length and surfaces
 * Moroccan-style example prompts. Captured GPS coords are shown alongside
 * so the user can confirm what's being sent to the driver app.
 */
export function LandmarkInput({
  value,
  onChange,
  coords,
  onCaptureCoords,
  capturing,
}: {
  value: string;
  onChange: (v: string) => void;
  coords: Coords | null;
  onCaptureCoords: () => void;
  capturing: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const valid = value.trim().length >= MIN_LANDMARK_LENGTH;
  const showError = !valid && value.length > 0;

  return (
    <View>
      <View className="flex-row items-center mb-2">
        <MapPin size={14} color="#FF5722" strokeWidth={2.5} />
        <Text
          className="ml-1.5 text-[11px] uppercase font-bold"
          style={{ letterSpacing: 1.4, color: '#7A6F66' }}
        >
          Landmark · required
        </Text>
      </View>

      <MotiView
        animate={{
          borderColor: focused
            ? '#FF5722'
            : showError
              ? '#EF4444'
              : 'rgba(26,20,16,0.10)',
          shadowOpacity: focused ? 0.18 : 0,
        }}
        transition={{ type: 'timing', duration: 220 }}
        style={{
          borderWidth: 1.5,
          borderRadius: 16,
          backgroundColor: '#FBF7F2',
          shadowColor: '#FF5722',
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 14,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder='e.g. "Near the Grand Mosque"'
          placeholderTextColor="#9B8F84"
          multiline
          style={{
            paddingHorizontal: 18,
            paddingVertical: 16,
            fontSize: 15,
            color: '#1A1410',
            minHeight: 64,
            fontFamily: 'System',
          }}
        />
      </MotiView>

      {showError && (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 180 }}
        >
          <Text className="text-[12px] mt-2" style={{ color: '#EF4444' }}>
            Add a quick landmark so your driver finds you fast.
          </Text>
        </MotiView>
      )}

      <View className="flex-row items-center mt-3">
        <Sparkles size={12} color="#7A6F66" />
        <Text className="ml-1.5 text-[11px] font-semibold" style={{ color: '#7A6F66' }}>
          Try one of these
        </Text>
      </View>
      <View className="flex-row flex-wrap mt-2">
        {SUGGESTIONS.map((s) => (
          <MotiView
            key={s}
            from={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 240 }}
            style={{ marginRight: 8, marginBottom: 8 }}
          >
            <Text
              onPress={() => onChange(s)}
              className="border border-black/10 rounded-full px-3 py-1.5 text-[12px]"
              style={{ color: '#2A211C' }}
            >
              {s}
            </Text>
          </MotiView>
        ))}
      </View>

      {/* GPS capture strip */}
      <View className="mt-5 rounded-2xl p-4 flex-row items-center" style={{ backgroundColor: '#FFF1EB' }}>
        <View
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: '#FF5722' }}
        >
          <MapPin size={16} color="#fff" strokeWidth={2.5} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[11px] uppercase font-bold" style={{ letterSpacing: 1.2, color: '#7A6F66' }}>
            GPS pin
          </Text>
          <Text className="text-[14px] mt-0.5 font-semibold" style={{ color: '#1A1410' }}>
            {coords
              ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
              : capturing
                ? 'Reading your location…'
                : 'Tap to capture'}
          </Text>
          {coords?.accuracyM != null && (
            <Text className="text-[11px] mt-0.5" style={{ color: '#7A6F66' }}>
              ±{Math.round(coords.accuracyM)} m accuracy
            </Text>
          )}
        </View>
        <Text
          onPress={onCaptureCoords}
          className="text-[12px] font-bold px-3 py-2 rounded-full"
          style={{
            color: coords ? '#7A6F66' : '#FFFFFF',
            backgroundColor: coords ? 'transparent' : '#FF5722',
            overflow: 'hidden',
          }}
        >
          {coords ? 'Update' : 'Capture'}
        </Text>
      </View>
    </View>
  );
}

export { MIN_LANDMARK_LENGTH };
