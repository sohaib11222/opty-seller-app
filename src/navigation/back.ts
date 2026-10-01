import { router } from 'expo-router';

/** Pops the actual Expo stack whenever there is one; fallback is only for deep links. */
export function goBack(fallback: string) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}
