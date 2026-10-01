import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { LanguageProvider } from '../features/i18n/LanguageContext';
import { SplashScreen } from '../screens/auth/AuthScreens';
import { InAppNotificationListener } from '../components/notifications/InAppNotificationListener';
import { SellerSidebarProvider } from '../components/navigation/SellerSidebar';
import { WarehouseCartProvider } from '../features/warehouse/WarehouseCartContext';
import { CampaignDraftProvider } from '../features/campaigns/CampaignDraftContext';
import { SellerBadgeProvider } from '../features/notifications/SellerBadgeContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Outermost so every screen, including the auth and splash copy that is
          shown before authentication, can read the language preference. */}
      <LanguageProvider>
        <AuthProvider>
          <SellerBadgeProvider><WarehouseCartProvider><CampaignDraftProvider><SellerSidebarProvider><RootNavigator /></SellerSidebarProvider></CampaignDraftProvider></WarehouseCartProvider></SellerBadgeProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { initializing, isAuthenticated } = useAuth();
  if (initializing) return <SplashScreen />;

  return (
    <>
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(setup)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="action-centre" />
        <Stack.Screen name="account" />
        <Stack.Screen name="banners" />
        <Stack.Screen name="campaign-details/[kind]/[id]" />
        <Stack.Screen name="campaign-wizard/[kind]/step-1" />
        <Stack.Screen name="campaign-wizard/[kind]/step-2" />
        <Stack.Screen name="campaign-wizard/[kind]/step-3" />
        <Stack.Screen name="campaign-wizard/[kind]/step-4" />
        <Stack.Screen name="business-tool" />
        <Stack.Screen name="business-details" />
        <Stack.Screen name="business-wizard" />
        <Stack.Screen name="boost-campaigns" />
        <Stack.Screen name="boost-campaign/[id]" />
        <Stack.Screen name="boost-campaign-create" />
        <Stack.Screen name="configuration" />
        <Stack.Screen name="configuration-editor" />
        <Stack.Screen name="configuration-detail" />
        <Stack.Screen name="coupons" />
        <Stack.Screen name="coupon/[id]" />
        <Stack.Screen name="coupon-create" />
        <Stack.Screen name="edit-store" />
        <Stack.Screen name="faqs" />
        <Stack.Screen name="followers" />
        <Stack.Screen name="message-thread" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="order-details/[id]" />
        <Stack.Screen name="product-create" />
        <Stack.Screen name="product-details/[id]" />
        <Stack.Screen name="product-editor" />
        <Stack.Screen name="promotions" />
        <Stack.Screen name="referral-campaigns" />
        <Stack.Screen name="referral-campaign/[id]" />
        <Stack.Screen name="referral-campaign-create" />
        <Stack.Screen name="reviews" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="store" />
        <Stack.Screen name="store-health" />
        <Stack.Screen name="store-performance" />
        <Stack.Screen name="support" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="wallet-top-up" options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="warehouse" />
        <Stack.Screen name="warehouse-cart" />
        <Stack.Screen name="warehouse-product/[id]" />
        <Stack.Screen name="warehouse-orders" />
      </Stack.Protected>
    </Stack>
    <InAppNotificationListener />
    </>
  );
}
