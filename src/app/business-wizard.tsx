import { useLocalSearchParams } from 'expo-router';
import { BoostCampaignCreateScreen } from '../screens/tools/BoostCampaignScreens';
import { CouponEditorScreen, ReferralEditorScreen } from '../screens/tools/CouponReferralScreens';
import { BusinessWizardScreen } from '../screens/tools/BusinessFlowScreens';

/** Existing boost creation links now always open a new, isolated campaign session. */
export default function BusinessWizardRoute() {
  const { tool } = useLocalSearchParams<{ tool?: string }>();
  if (tool === 'boost') return <BoostCampaignCreateScreen />;
  if (tool === 'coupons') return <CouponEditorScreen />;
  if (tool === 'referrals') return <ReferralEditorScreen />;
  return <BusinessWizardScreen />;
}
