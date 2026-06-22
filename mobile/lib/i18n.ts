// AtlaasGo — app interface i18n (EN / FR / AR).
//
// Pure-JS (i18next + react-i18next) — no native module — so it hot-reloads on
// the existing dev/preview builds. Arabic RTL uses React Native's built-in
// I18nManager; flipping the layout direction only takes effect after an app
// reload, so setAppLanguage() reports needsRestart and the caller prompts.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import fr from '../locales/fr.json';
import ar from '../locales/ar.json';

export type Lang = 'en' | 'fr' | 'ar';
export const LANG_KEY = 'ag_lang'; // matches the existing Account persistence
export const RTL_LANGS: Lang[] = ['ar'];
export const isRtl = (l: Lang): boolean => RTL_LANGS.includes(l);
export const LANG_LABELS: Record<Lang, string> = { en: 'English', fr: 'Français', ar: 'العربية' };

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

/** Apply the saved language at startup and align the RTL flag. Call once at root. */
export async function bootstrapLanguage(): Promise<void> {
  try {
    I18nManager.allowRTL(true);
    const saved = (await AsyncStorage.getItem(LANG_KEY)) as Lang | null;
    const lang: Lang = saved === 'fr' || saved === 'ar' || saved === 'en' ? saved : 'en';
    if (i18n.language !== lang) await i18n.changeLanguage(lang);
    if (I18nManager.isRTL !== isRtl(lang)) I18nManager.forceRTL(isRtl(lang));
  } catch {
    /* fall back to en */
  }
}

/**
 * Switch the app language everywhere (text updates live via react-i18next).
 * Returns { needsRestart: true } when the RTL direction flips (to/from Arabic),
 * because I18nManager only applies a direction change after the app reloads.
 */
export async function setAppLanguage(next: Lang): Promise<{ needsRestart: boolean }> {
  await i18n.changeLanguage(next);
  try {
    await AsyncStorage.setItem(LANG_KEY, next);
  } catch {
    /* ignore */
  }
  const needsRestart = I18nManager.isRTL !== isRtl(next);
  if (needsRestart) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(isRtl(next));
  }
  return { needsRestart };
}

export default i18n;
