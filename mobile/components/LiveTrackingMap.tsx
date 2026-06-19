import { View, Text, Platform } from 'react-native';
import Constants from 'expo-constants';

// Defensive require: react-native-maps is a native module that only exists
// after a native rebuild. Until then this renders a graceful fallback.
let Maps: any = null;
try {
  Maps = require('react-native-maps');
} catch {
  Maps = null;
}

// On Android, Google Maps crashes the activity if no API key is configured in
// the manifest (android.config.googleMaps.apiKey). iOS uses Apple Maps — no key.
const androidMapsKey =
  (Constants.expoConfig as any)?.android?.config?.googleMaps?.apiKey ?? null;
const mapSupported = Platform.OS !== 'android' || !!androidMapsKey;

type Pt = { lat: number; lng: number };

export function LiveTrackingMap({
  rider,
  dest,
  height = 200,
}: {
  rider: Pt | null;
  dest: Pt | null;
  height?: number;
}) {
  const MapView = Maps?.default;
  const Marker = Maps?.Marker;

  if (!MapView || !Marker || !mapSupported || (!rider && !dest)) {
    return (
      <View
        style={{
          height,
          borderRadius: 20,
          backgroundColor: 'rgba(26,20,16,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(26,20,16,0.07)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#7A6F66', fontSize: 13, paddingHorizontal: 24, textAlign: 'center' }}>
          {!MapView
            ? 'Live map activates after the next app build.'
            : !mapSupported
              ? 'Live tracking is on — map view arrives here soon.'
              : 'Waiting for your driver to start moving…'}
        </Text>
      </View>
    );
  }

  const pts = [rider, dest].filter(Boolean) as Pt[];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const region = {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    latitudeDelta: Math.max((Math.max(...lats) - Math.min(...lats)) * 1.8, 0.012),
    longitudeDelta: Math.max((Math.max(...lngs) - Math.min(...lngs)) * 1.8, 0.012),
  };

  return (
    <View style={{ height, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(26,20,16,0.08)' }}>
      <MapView style={{ flex: 1 }} region={region} pointerEvents="none">
        {dest && (
          <Marker coordinate={{ latitude: dest.lat, longitude: dest.lng }} title="Delivery spot" pinColor="#1A1410" />
        )}
        {rider && (
          <Marker
            coordinate={{ latitude: rider.lat, longitude: rider.lng }}
            title="Your driver"
            description="Live location"
            pinColor="#FF5722"
          />
        )}
      </MapView>
    </View>
  );
}
