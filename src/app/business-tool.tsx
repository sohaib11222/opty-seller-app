import { useLocalSearchParams } from 'expo-router';
import { BoostCampaignListScreen } from '../screens/tools/BoostCampaignScreens';
import { CouponListScreen, ReferralListScreen } from '../screens/tools/CouponReferralScreens';
import { BusinessFlowScreen } from '../screens/tools/BusinessFlowScreens';

/** Preserves existing boost deep links while routing them to the complete flow. */
export default function BusinessToolRoute() {
  const { tool } = useLocalSearchParams<{ tool?: string }>();
  if (tool === 'boost') return <BoostCampaignListScreen />;
  if (tool === 'coupons') return <CouponListScreen />;
  if (tool === 'referrals') return <ReferralListScreen />;
  return <BusinessFlowScreen />;
}
