import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppButton } from '../../components/ui/AppButton';
import { LanguageToggle } from '../../components/ui/LanguageToggle';
import { MainHeaderActions } from '../../components/ui/MainHeaderActions';
import { Screen } from '../../components/ui/Screen';
import { StoreDashboard } from '../../components/dashboard/StoreDashboard';
import { getDashboardSnapshot } from '../../services/dashboard/dashboard.service';
import { getErrorMessage } from '../../services/api/client';
import type { DashboardSnapshot } from '../../types/seller';
import { colors, gradients, radius, shadow } from '../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../features/auth/AuthContext';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

export function DashboardScreen() {
  const { t } = useLanguage();
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadDashboard = useCallback(() => {
    return getDashboardSnapshot().then((next) => { setDashboard(next); setError(null); }).catch((cause) => setError(getErrorMessage(cause)));
  }, []);
  useAutoRefresh(loadDashboard);
  return (
    <Screen contentStyle={styles.homeContent} overlay={dashboard ? <Pressable accessibilityLabel={t('home.addProductLabel')} onPress={() => router.push('/product-create')} style={styles.fab}><MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" /></Pressable> : null}>
      <AppHeader title={t('home.title')} right={<View style={styles.headerActions}><LanguageToggle /><MainHeaderActions /></View>} />
      <View style={styles.dashboardBody}>
        {!dashboard && !error ? <View style={styles.loader}><ActivityIndicator size="large" color={colors.blue} /></View> : null}
        {error ? <View style={styles.dashboardError}><MaterialCommunityIcons name="cloud-alert-outline" size={22} color={colors.red} /><View style={styles.errorCopy}><Text style={styles.errorTitle}>{t('home.errorTitle')}</Text><Text style={styles.errorText}>{error}</Text><Text onPress={loadDashboard} style={styles.retry}>{t('common.retry')}</Text></View></View> : null}
        {dashboard ? <StoreDashboard data={dashboard} onEditStore={() => router.push('/edit-store')} onViewOrders={() => router.push('/orders')} onAddProduct={() => router.push('/product-create')} onOpenActionCentre={() => router.push('/action-centre')} onOpenPerformance={() => router.push('/store-performance')} onOpenStore={() => router.push('/store')} onOpenOrder={(id) => router.push({ pathname: '/order-details/[id]', params: { id: String(id) } })} /> : null}
      </View>
    </Screen>
  );
}

export function ProductsScreen() {
  const { t } = useLanguage();
  return <Screen contentStyle={styles.tabContent}><AppHeader title={t('nav.products')} /><View style={styles.titleRow}><View><Text style={styles.overline}>{t('hub.catalogue')}</Text><Text style={styles.pageTitle}>{t('hub.productsCopy')}</Text></View><Pressable onPress={() => {}} style={styles.addCircle}><MaterialCommunityIcons name="plus" size={23} color="#FFFFFF" /></Pressable></View><View style={styles.productSummary}><View><Text style={styles.summaryLabel}>{t('hub.liveProducts')}</Text><Text style={styles.summaryValue}>24</Text></View><View style={styles.summaryDivider} /><View><Text style={styles.summaryLabel}>{t('hub.lowStock')}</Text><Text style={[styles.summaryValue, { color: colors.red }]}>03</Text></View><MaterialCommunityIcons name="package-variant-closed" size={42} color="#A9C9EF" /></View><View style={styles.segmented}><Text style={styles.segmentActive}>All</Text><Text style={styles.segment}>{t('hub.published')}</Text><Text style={styles.segment}>{t('hub.drafts')}</Text></View><ProductCard name="Frosted acetate frame" code="Eye glasses · 18 in stock" price="€129" icon="glasses" /><ProductCard name="Contact lens solution" code="Eye hygiene · 3 in stock" price="€7" icon="bottle-tonic-plus-outline" low /></Screen>;
}

function ProductCard({ name, code, price, icon, low }: { name: string; code: string; price: string; icon: 'glasses' | 'bottle-tonic-plus-outline'; low?: boolean }) {
  return <View style={styles.productCard}><View style={styles.productArt}><MaterialCommunityIcons name={icon} size={28} color="#416684" /></View><View style={styles.listCopy}><Text style={styles.listTitle}>{name}</Text><Text style={[styles.listSub, low && { color: colors.red }]}>{code}</Text></View><Text style={styles.listPrice}>{price}</Text></View>;
}

export function MessagesScreen() {
  const { t } = useLanguage();
  const messages = [['Hibos', t('messages.sampleDelivery'), '2m', true], ['Sohaib', t('messages.sampleThanks'), '1h', false], ['Seller support', t('messages.sampleApproved'), t('messages.yesterday'), false]] as const;
  return <Screen contentStyle={styles.tabContent}><AppHeader title={t('nav.messages')} /><Text style={styles.overline}>{t('hub.customerCare')}</Text><Text style={styles.pageTitle}>{t('hub.messagesCopy')}</Text><View style={styles.messagePrompt}><MaterialCommunityIcons name="message-text-outline" size={22} color={colors.blue} /><View><Text style={styles.promptTitle}>{t('hub.replyNow')}</Text><Text style={styles.promptCopy}>{t('hub.deliveryQuoteWait')}</Text></View></View>{messages.map(([name, copy, time, unread], index) => <View key={name} style={styles.messageRow}><View style={[styles.avatar, index === 2 && { backgroundColor: '#E8F8EF' }]}><Text style={styles.avatarText}>{name.charAt(0)}</Text></View><View style={styles.messageCopy}><Text style={styles.listTitle}>{name}</Text><Text numberOfLines={1} style={styles.listSub}>{copy}</Text></View><View style={styles.messageTime}><Text style={styles.time}>{time}</Text>{unread ? <View style={styles.unread} /> : null}</View></View>)}</Screen>;
}

export function ProfileScreen() {
  const { t } = useLanguage();
  const { session, signOut } = useAuth();
  const sellerName = session?.user.name ?? 'Seller';
  const leaveWorkspace = async () => { await signOut(); router.replace('/sign-in'); };
  return <Screen contentStyle={styles.tabContent}><AppHeader title={t('nav.profile')} right={<MaterialCommunityIcons name="cog-outline" size={21} color="#3E5877" />} withMainActions rightA11yLabel={t('nav.sellerSettings')} onRightPress={() => router.push('/settings')} /><LinearGradient colors={gradients.revenue} style={styles.profileHero}><View style={styles.profileTop}><View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{sellerName.charAt(0).toUpperCase()}</Text></View><View><Text style={styles.profileName}>{sellerName}</Text><Text style={styles.profileStore}>{session?.user.email ?? 'Seller workspace'}</Text></View></View><View style={styles.profileStats}><Text style={styles.profileStat}>—{`\n`}<Text style={styles.profileStatLabel}>{t('nav.products')}</Text></Text><Text style={styles.profileStat}>—{`\n`}<Text style={styles.profileStatLabel}>{t('nav.orders')}</Text></Text></View></LinearGradient><ProfileLink icon="wallet-outline" title={t('profile.walletPayouts')} copy={t('profile.walletPayoutsCopy')} onPress={() => {}} /><ProfileLink icon="storefront-outline" title={t('profile.storeProfile')} copy={t('profile.storeProfileCopy')} onPress={() => router.push('/store')} /><ProfileLink icon="warehouse" title={t('nav.warehouse')} copy={t('nav.warehouseCopy')} onPress={() => {}} /><ProfileLink icon="rocket-launch-outline" title={t('hub.growthTools')} copy={t('hub.growthToolsCopy')} onPress={() => {}} /><View style={styles.helpBlock}><Text style={styles.helpTitle}>{t('hub.essentialsTitle')}</Text><Text style={styles.helpText}>{t('hub.essentialsCopy')}</Text><AppButton label={t('hub.accountSettings')} variant="secondary" onPress={() => router.push('/settings')} style={styles.profileButton} /><AppButton label={t('hub.signOut')} variant="text" onPress={() => void leaveWorkspace()} style={styles.signOutButton} /></View></Screen>;
}

function ProfileLink({ icon, title, copy, onPress }: { icon: 'wallet-outline' | 'storefront-outline' | 'warehouse' | 'rocket-launch-outline'; title: string; copy: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.profileLink}><View style={styles.linkIcon}><MaterialCommunityIcons name={icon} size={22} color={colors.blue} /></View><View style={styles.listCopy}><Text style={styles.listTitle}>{title}</Text><Text style={styles.listSub}>{copy}</Text></View><MaterialCommunityIcons name="chevron-right" size={21} color="#91A0B3" /></Pressable>;
}

const styles = StyleSheet.create({
  homeContent: { paddingBottom: 120 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dashboardBody: { paddingHorizontal: 20 },
  tabContent: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 128 },
  loader: { flex: 1, minHeight: 360, justifyContent: 'center', alignItems: 'center' },
  dashboardError: { marginTop: 24, borderRadius: radius.md, padding: 15, backgroundColor: '#FFF0F1', flexDirection: 'row', gap: 10 },
  errorCopy: { flex: 1 },
  errorTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  errorText: { color: '#9C454B', fontSize: 12, lineHeight: 17, marginTop: 3 },
  retry: { color: colors.blue, fontSize: 12, fontWeight: '800', marginTop: 8 },
  fab: { position: 'absolute', right: 26, bottom: 104, width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, shadowColor: colors.blue, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.32, shadowRadius: 20, elevation: 9 },
  overline: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.05, textTransform: 'uppercase', marginTop: 18 },
  pageTitle: { color: colors.ink, fontSize: 25, lineHeight: 30, fontWeight: '800', letterSpacing: -1, marginTop: 4, marginBottom: 16 },
  attentionCard: { padding: 13, borderRadius: radius.md, backgroundColor: '#EEF5FF', flexDirection: 'row', alignItems: 'center' },
  attentionIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  attentionNumber: { color: colors.blue, fontSize: 17, fontWeight: '800' },
  attentionCopy: { flex: 1, marginLeft: 10 },
  attentionTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  attentionText: { color: colors.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  segmented: { padding: 3, backgroundColor: '#EDF1F7', borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  segment: { flex: 1, paddingVertical: 8, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.muted },
  segmentActive: { flex: 1, paddingVertical: 8, textAlign: 'center', fontSize: 11, fontWeight: '800', color: colors.blue, backgroundColor: '#FFFFFF', borderRadius: 8, ...shadow.card },
  listCard: { marginTop: 8, padding: 11, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', ...shadow.card },
  listIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#DDEFFD', alignItems: 'center', justifyContent: 'center' },
  listCopy: { flex: 1, marginLeft: 10, minWidth: 0 },
  listTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  listSub: { color: colors.subtle, fontSize: 11, marginTop: 3 },
  listEnd: { alignItems: 'flex-end', marginLeft: 6 },
  listPrice: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  status: { overflow: 'hidden', marginTop: 5, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 7, fontSize: 9, fontWeight: '800' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addCircle: { width: 41, height: 41, borderRadius: 14, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: 15, ...shadow.floating },
  productSummary: { minHeight: 92, borderRadius: radius.md, backgroundColor: '#EEF5FF', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 15 },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.8, marginTop: 3 },
  summaryDivider: { width: 1, height: 43, backgroundColor: '#D7E4F4' },
  productCard: { marginTop: 8, padding: 11, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', ...shadow.card },
  productArt: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#DDEFFD', alignItems: 'center', justifyContent: 'center' },
  messagePrompt: { padding: 13, borderRadius: radius.md, backgroundColor: '#EEF5FF', flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 6 },
  promptTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  promptCopy: { color: colors.muted, fontSize: 12, marginTop: 3 },
  messageRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDEFFD' },
  avatarText: { color: colors.blue, fontSize: 16, fontWeight: '800' },
  messageCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  messageTime: { alignItems: 'flex-end', minWidth: 52 },
  time: { color: colors.muted, fontSize: 11 },
  unread: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue, marginTop: 7 },
  profileHero: { padding: 15, borderRadius: radius.md, marginTop: 18 },
  profileTop: { flexDirection: 'row', alignItems: 'center' },
  profileAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  profileAvatarText: { color: colors.blue, fontSize: 21, fontWeight: '800' },
  profileName: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  profileStore: { color: '#DCEEFF', fontSize: 12, marginTop: 3 },
  profileStats: { flexDirection: 'row', gap: 52, marginTop: 15 },
  profileStat: { color: '#FFFFFF', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  profileStatLabel: { color: '#DCEEFF', fontSize: 11, fontWeight: '600' },
  profileLink: { padding: 12, marginTop: 9, backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', ...shadow.card },
  linkIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  helpBlock: { marginTop: 15, borderRadius: radius.md, padding: 14, backgroundColor: '#EEF5FF' },
  helpTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  helpText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  profileButton: { marginTop: 12 },
  signOutButton: { marginTop: 6 },
});
