import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ONBOARDING_KEY = 'opm-seller-onboarding-v1';

/**
 * Onboarding is a first-run introduction, so it must be shown exactly once.
 * The flag follows the same persistence strategy AuthContext and
 * LanguageContext use: encrypted device storage on mobile, local storage on web
 * where SecureStore is unavailable.
 *
 * Failing to read the flag is treated as "already seen" so a storage error can
 * never trap a returning seller in an onboarding loop.
 */
const onboardingStorage = {
  get: async () => (Platform.OS === 'web'
    ? globalThis.localStorage?.getItem(ONBOARDING_KEY) === 'true'
    : (await SecureStore.getItemAsync(ONBOARDING_KEY)) === 'true'),
  set: async (seen: boolean) => {
    if (Platform.OS === 'web') {
      if (seen) globalThis.localStorage?.setItem(ONBOARDING_KEY, 'true');
      else globalThis.localStorage?.removeItem(ONBOARDING_KEY);
      return;
    }
    if (seen) await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    else await SecureStore.deleteItemAsync(ONBOARDING_KEY);
  },
};

export function hasSeenOnboarding(): Promise<boolean> {
  return onboardingStorage.get().catch(() => true);
}

export function markOnboardingSeen(): Promise<void> {
  return onboardingStorage.set(true).catch(() => undefined);
}

/** Clears the flag so the introduction is shown again. */
export function resetOnboarding(): Promise<void> {
  return onboardingStorage.set(false).catch(() => undefined);
}