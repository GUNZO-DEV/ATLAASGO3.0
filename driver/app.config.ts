import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Dynamic config layered on app.json. Injects the Android Google Maps SDK key
 * (used by react-native-maps on the active-delivery screen) from env, so the
 * key isn't committed. Unset → the map degrades to a key-less fallback.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const androidMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ?? '';
  return {
    ...config,
    name: config.name ?? 'AtlaasGo Driver',
    slug: config.slug ?? 'atlaasgo-driver',
    android: {
      ...config.android,
      config: {
        ...(config.android?.config ?? {}),
        googleMaps: { apiKey: androidMapsKey },
      },
    },
  };
};
