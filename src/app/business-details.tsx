import { useLocalSearchParams } from 'expo-router';
import { BoostCampaignDetailsScreen } from '../screens/tools/BoostCampaignScreens';
import { CouponDetailsScreen, ReferralDetailsScreen } from '../screens/tools/CouponReferralScreens';
import { BusinessDetailsScreen } from '../screens/tools/BusinessFlowScreens';

/** Existing boost detail links remain valid after the dedicated screen upgrade. */
export default function BusinessDetailsRoute() {
  const { tool } = useLocalSearchParams<{ tool?: string }>();
  if (tool === 'boost') return <BoostCampaignDetailsScreen />;
  if (tool === 'coupons') return <CouponDetailsScreen />;
  if (tool === 'referrals') return <ReferralDetailsScreen />;
  return <BusinessDetailsScreen />;
}
