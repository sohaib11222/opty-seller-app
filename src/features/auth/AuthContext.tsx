import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { setAccessToken } from '../../services/api/client';
import { authService, type BusinessVerification, type Credentials, type SellerRegistration, type SellerUser } from '../../services/auth/auth.service';

const SESSION_KEY = 'opm-seller-session-v1';
type SellerSession = { token: string; user: SellerUser };

// SecureStore is the persistent, encrypted store on device. Expo web does not
// implement the native deletion API, so the development preview uses browser
// storage only; no mobile credential falls back to local storage.
const sessionStorage = {
  get: async () => Platform.OS === 'web' ? globalThis.localStorage?.getItem(SESSION_KEY) ?? null : SecureStore.getItemAsync(SESSION_KEY),
  set: async (value: string) => {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(SESSION_KEY, value);
    else await SecureStore.setItemAsync(SESSION_KEY, value);
  },
  clear: async () => {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(SESSION_KEY);
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  },
};

type AuthContextValue = {
  initializing: boolean;
  isAuthenticated: boolean;
  /** False until the seller has confirmed the email on the account. */
  isEmailVerified: boolean;
  session: SellerSession | null;
  signIn: (credentials: Credentials) => Promise<void>;
  register: (details: SellerRegistration) => Promise<void>;
  sendVerificationCode: () => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  submitBusinessVerification: (details: BusinessVerification) => Promise<void>;
  refreshProfile: () => Promise<SellerUser | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SellerSession | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;
    void sessionStorage.get()
      .then((saved) => {
        if (!saved) return;
        const restored = JSON.parse(saved) as SellerSession;
        setAccessToken(restored.token);
        if (mounted) setSession(restored);
      })
      .catch(() => sessionStorage.clear())
      .finally(() => { if (mounted) setInitializing(false); });

    return () => { mounted = false; };
  }, []);

  const saveSession = async (next: SellerSession) => {
    setAccessToken(next.token);
    await sessionStorage.set(JSON.stringify(next));
    setSession(next);
  };

  const clearSession = async () => {
    setAccessToken(null);
    setSession(null);
    await sessionStorage.clear().catch(() => undefined);
  };

  const value = useMemo<AuthContextValue>(() => ({
    initializing,
    isAuthenticated: Boolean(session),
    // A restored session predating verification still has to clear the code step.
    isEmailVerified: Boolean(session?.user.email_verified_at),
    session,
    signIn: async (credentials) => { await saveSession(await authService.signIn(credentials)); },
    register: async (details) => { await saveSession(await authService.register(details)); },
    sendVerificationCode: async () => { await authService.sendEmailVerification(); },
    verifyEmail: async (code) => {
      const { user } = await authService.verifyEmail(code);
      // Re-read through getProfile so the cached session matches the server,
      // rather than trusting the verification response alone.
      const refreshed = await authService.getProfile().then((payload) => payload.user).catch(() => user);
      if (session) await saveSession({ ...session, user: refreshed });
    },
    submitBusinessVerification: async (details) => { await authService.submitBusinessVerification(details); },
    refreshProfile: async () => {
      if (!session) return null;
      const { user } = await authService.getProfile();
      await saveSession({ ...session, user });
      return user;
    },
    signOut: async () => {
      try { await authService.signOut(); } finally { await clearSession(); }
    },
  }), [initializing, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
