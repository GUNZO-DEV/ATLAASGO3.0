import * as SecureStore from 'expo-secure-store';
import type { TokenCache } from '@clerk/clerk-expo';

/**
 * Clerk token cache backed by expo-secure-store (encrypted keychain on iOS,
 * KeyStore on Android). Clerk recommends a secure cache so the session token
 * isn't sitting in plain AsyncStorage.
 */
export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* ignore write failures — Clerk will re-fetch */
    }
  },
};
