import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

export type Coords = { lat: number; lng: number; accuracyM?: number };

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'denied' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async (): Promise<Coords | null> => {
    setStatus('requesting');
    setError(null);
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        setStatus('denied');
        setError('Location permission denied');
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const next: Coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy ?? undefined,
      };
      setCoords(next);
      setStatus('ready');
      return next;
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Failed to read location');
      return null;
    }
  }, []);

  return { coords, status, error, capture };
}
