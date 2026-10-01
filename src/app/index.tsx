import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SplashScreen } from '../screens/auth/AuthScreens';
import { useAuth } from '../features/auth/AuthContext';
import { hasSeenOnboarding, markOnboardingSeen } from '../features/onboarding/onboardingStorage';

export default function IndexScreen() {
  const { isAuthenticated } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [seenOnboarding, setSeenOnboarding] = useState(true);

  useEffect(() => {
    let active = true;
    void hasSeenOnboarding().then((seen) => {
      if (!active) return;
      setSeenOnboarding(seen);
      setOnboardingChecked(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    // Wait for the flag so a returning seller is never flashed the
    // introduction before being sent to sign in.
    if (!onboardingChecked) return;
    if (isAuthenticated) void markOnboardingSeen();
    const timeout = setTimeout(() => {
      if (isAuthenticated) router.replace('/(tabs)');
      // Sign in explicitly: the (auth) group has no index route, so navigating
      // to the group itself would resolve to whichever route sorts first.
      else if (seenOnboarding) router.replace('/sign-in');
      else router.replace('/onboarding');
    }, 950);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, onboardingChecked, seenOnboarding]);

  return <SplashScreen />;
}