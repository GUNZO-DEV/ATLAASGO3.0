import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Dynamic config layered on top of the static app.json.
 *
 * app.json stays the source of truth for everything; this file only injects
 * the production secrets that must NOT be committed, reading them from env:
 *
 *   EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY  → Android Google Maps SDK key
 *                                          (live rider-tracking map; falls back
 *                                           to a static card when unset)
 *   GOOGLE_SERVICES_JSON                 → path to google-services.json
 *                                          (Android FCM / remote push)
 *
 * Unset vars degrade gracefully — the map shows its no-key fallback and no
 * googleServicesFile is referenced — so this never breaks a build.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const androidMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ?? '';
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ?? (config.android as any)?.googleServicesFile ?? './google-services.json';

  return {
    ...config,
    name: config.name ?? 'AtlaasGo',
    slug: config.slug ?? 'atlaasgo',
    android: {
      ...config.android,
      // react-native-maps reads the key from android.config.googleMaps.apiKey;
      // LiveTrackingMap checks it and renders a fallback when empty.
      config: {
        ...(config.android?.config ?? {}),
        googleMaps: { apiKey: androidMapsKey },
      },
      // Only set when provided, so an unset env var leaves the field absent.
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
