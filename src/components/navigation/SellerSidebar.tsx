import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { storeService, type SellerStore } from '../../services/seller/store.service';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { colors, radius, shadow } from '../../theme/tokens';

type SidebarState = { openSidebar: () => void; closeSidebar: () => void };
const SidebarContext = createContext<SidebarState>({ openSidebar: () => undefined, closeSidebar: () => undefined });
export const useSellerSidebar = () => useContext(SidebarContext);

type SidebarItem = { labelKey: string; copyKey: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; route: string };
const growth: SidebarItem[] = [
  { labelKey: 'nav.banners', copyKey: 'nav.bannersCopy', icon: 'image-multiple-outline', route: '/banners?kind=banner' },
  { labelKey: 'nav.discountCampaigns', copyKey: 'nav.discountCampaignsCopy', icon: 'sale-outline', route: '/promotions?kind=discount' },
  { labelKey: 'nav.coupons', copyKey: 'nav.couponsCopy', icon: 'ticket-percent-outline', route: '/coupons' },
  { labelKey: 'nav.referralCampaigns', copyKey: 'nav.referralCampaignsCopy', icon: 'account-supervisor-outline', route: '/referral-campaigns' },
  { labelKey: 'nav.boostProduct', copyKey: 'nav.boostProductCopy', icon: 'rocket-launch-outline', route: '/boost-campaigns' },
];
const operations: SidebarItem[] = [
  { labelKey: 'nav.warehouse', copyKey: 'nav.warehouseCopy', icon: 'warehouse', route: '/warehouse' },
  { labelKey: 'nav.statistics', copyKey: 'nav.statisticsCopy', icon: 'chart-box-outline', route: '/business-tool?tool=statistics' },
  { labelKey: 'nav.announcements', copyKey: 'nav.announcementsCopy', icon: 'bullhorn-outline', route: '/business-tool?tool=announcements' },
];

export function SellerSidebarProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false); const [store, setStore] = useState<SellerStore | null>(null);
  const load = useCallback(async () => { try { setStore(await storeService.getStore()); } catch { /* The drawer remains useful offline. */ } }, []);
  useEffect(() => { if (!visible) return; const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load, visible]);
  const value = useMemo(() => ({ openSidebar: () => setVisible(true), closeSidebar: () => setVisible(false) }), []);
  const go = (route: string) => { setVisible(false); router.push(route as never); };
  return <SidebarContext.Provider value={value}>{children}<Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}><View style={styles.overlay}><Pressable style={styles.scrim} onPress={() => setVisible(false)} /><View style={styles.drawer}><View style={styles.top}><View style={styles.brand}><View style={styles.avatar}>{store?.profile_image_url ? <Image source={{ uri: store.profile_image_url }} style={styles.avatarImage} /> : <MaterialCommunityIcons name="storefront-outline" size={23} color={colors.blue} />}</View><View style={styles.storeCopy}><Text numberOfLines={1} style={styles.storeName}>{store?.name || t('nav.sellerWorkspace')}</Text><Text style={styles.storeMeta}>{store?.status === 'active' ? t('nav.storeActive') : t('nav.storeManagement')}</Text></View></View><Pressable accessibilityLabel={t('nav.closeMenu')} onPress={() => setVisible(false)} style={styles.close}><MaterialCommunityIcons name="close" size={21} color="#3E5877" /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}><Text style={styles.section}>{t('nav.growthSection')}</Text>{growth.map((item) => <DrawerRow key={item.route} item={item} onPress={() => go(item.route)} />)}<Text style={styles.section}>{t('nav.operationsSection')}</Text>{operations.map((item) => <DrawerRow key={item.route} item={item} onPress={() => go(item.route)} />)}<Text style={styles.section}>{t('nav.accountSection')}</Text><DrawerRow item={{ labelKey: 'nav.storeSettings', copyKey: 'nav.storeSettingsCopy', icon: 'cog-outline', route: '/settings' }} onPress={() => go('/settings')} /><DrawerRow item={{ labelKey: 'nav.configuration', copyKey: 'nav.configurationCopy', icon: 'tune-variant', route: '/configuration' }} onPress={() => go('/configuration')} /></ScrollView><Pressable onPress={() => go('/profile')} style={styles.account}><MaterialCommunityIcons name="account-circle-outline" size={20} color={colors.blue} /><Text style={styles.accountText}>{t('nav.myAccount')}</Text><MaterialCommunityIcons name="chevron-right" size={20} color="#91A0B3" /></Pressable></View></View></Modal></SidebarContext.Provider>;
}

function DrawerRow({ item, onPress }: { item: SidebarItem; onPress: () => void }) {
  const { t } = useLanguage();
  return <Pressable onPress={onPress} style={styles.row}><View style={styles.rowIcon}><MaterialCommunityIcons name={item.icon} size={20} color={colors.blue} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{t(item.labelKey)}</Text><Text style={styles.rowText}>{t(item.copyKey)}</Text></View><MaterialCommunityIcons name="chevron-right" size={20} color="#91A0B3" /></Pressable>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' }, scrim: { flex: 1, backgroundColor: 'rgba(9,24,45,.40)' }, drawer: { width: '86%', maxWidth: 362, backgroundColor: '#F7F9FD', paddingTop: 52, paddingBottom: 24, ...shadow.floating }, top: { paddingHorizontal: 18, paddingBottom: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E4EAF2' }, brand: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { height: 48, width: 48, borderRadius: 16, backgroundColor: '#DDEFFD', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, storeCopy: { flex: 1, minWidth: 0 }, storeName: { color: colors.ink, fontSize: 15, fontWeight: '800' }, storeMeta: { color: colors.muted, marginTop: 3, fontSize: 11 }, close: { height: 36, width: 36, borderRadius: 12, marginLeft: 8, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', ...shadow.card }, content: { paddingHorizontal: 13, paddingBottom: 16 }, section: { color: '#76869C', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 20, marginBottom: 7, paddingHorizontal: 7 }, row: { minHeight: 62, paddingHorizontal: 8, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', gap: 10 }, rowIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#E7F1FF', alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1, minWidth: 0 }, rowTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, rowText: { color: colors.muted, marginTop: 2, fontSize: 10 }, account: { minHeight: 53, marginHorizontal: 13, paddingHorizontal: 12, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.surface, ...shadow.card }, accountText: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '800' },
});
