import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { profileService, type SellerUnreadSummary } from '../../services/profile/profile.service';
import { useAuth } from '../auth/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

const emptySummary: SellerUnreadSummary = {
  messages: 0,
  orders: 0,
  support: 0,
  files: 0,
  notifications: 0,
  total: 0,
};

type SellerBadgeContextValue = {
  summary: SellerUnreadSummary;
  refreshBadges: () => Promise<void>;
  markOrdersRead: () => Promise<void>;
};

const SellerBadgeContext = createContext<SellerBadgeContextValue>({
  summary: emptySummary,
  refreshBadges: async () => undefined,
  markOrdersRead: async () => undefined,
});

/** One live, server-authoritative source for unread dots throughout the app. */
export function SellerBadgeProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<SellerUnreadSummary>(emptySummary);

  const refreshBadges = useCallback(async () => {
    if (!isAuthenticated) {
      setSummary(emptySummary);
      return;
    }
    setSummary(await profileService.unreadSummary());
  }, [isAuthenticated]);

  const markOrdersRead = useCallback(async () => {
    if (!isAuthenticated) return;
    setSummary(await profileService.markUnreadCategoryRead('orders'));
  }, [isAuthenticated]);

  useAutoRefresh(() => refreshBadges().catch(() => undefined), isAuthenticated, 10_000);

  const value = useMemo(() => ({ summary, refreshBadges, markOrdersRead }), [summary, refreshBadges, markOrdersRead]);
  return <SellerBadgeContext.Provider value={value}>{children}</SellerBadgeContext.Provider>;
}

export function useSellerBadges() {
  return useContext(SellerBadgeContext);
}
