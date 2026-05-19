/**
 * Firestore client init.
 *
 * Resolution order:
 *   1. EXPO_PUBLIC_USE_EMULATOR=true → connect to local Firestore emulator
 *   2. EXPO_PUBLIC_FIREBASE_PROJECT_ID set → connect to production
 *   3. __DEV__ build with neither set → default to emulator (zero-config dev)
 *   4. Production build with neither set → broken; will surface an error
 *
 * Emulator host detection:
 *   - iOS simulator       → 127.0.0.1
 *   - Android emulator    → 10.0.2.2
 *   - Physical device     → LAN IP from Constants.expoConfig.hostUri
 *   - Override            → EXPO_PUBLIC_EMULATOR_HOST
 *
 * Security note: the bundled config is intentionally public — Firestore is
 * secured by rules, not by hiding the web-app config.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

const explicitlyEmulator = process.env.EXPO_PUBLIC_USE_EMULATOR === 'true';
const hasProductionConfig = !!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const useEmulator = explicitlyEmulator || (!hasProductionConfig && __DEV__);

const firebaseConfig = useEmulator
  ? { projectId: 'demo-atlaasgo', apiKey: 'demo-key' }
  : {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
    };

let _app: FirebaseApp | undefined;
let _db: Firestore | undefined;

function emulatorHost(): string {
  if (process.env.EXPO_PUBLIC_EMULATOR_HOST) return process.env.EXPO_PUBLIC_EMULATOR_HOST;
  if (Platform.OS === 'android') return '10.0.2.2';
  const lan = Constants.expoConfig?.hostUri?.split(':')[0];
  if (lan && lan !== '127.0.0.1' && lan !== 'localhost') return lan;
  return '127.0.0.1';
}

export function getFirebaseApp(): FirebaseApp {
  if (!_app) _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

export function getDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
    if (useEmulator) {
      const host = emulatorHost();
      try {
        connectFirestoreEmulator(_db, host, 8080);
        // eslint-disable-next-line no-console
        console.log(`[firebase] connected to emulator at ${host}:8080`);
      } catch {
        // connectFirestoreEmulator throws if called twice — safe to swallow
        // under fast-refresh.
      }
    }
  }
  return _db;
}

export const db = getDb();
