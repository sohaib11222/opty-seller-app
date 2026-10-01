import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { DashboardSnapshot, RecentOrder } from '../../types/seller';
import { AppButton } from '../ui/AppButton';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { colors, gradients, radius, shadow } from '../../theme/tokens';

type StoreDashboardProps = {
  data: DashboardSnapshot;
  onEditStore: () => void;
  onViewOrders: () => void;
  onAddProduct: () => void;
  onOpenActionCentre: () => void;
  onOpenPerformance: () => void;
  onOpenStore: () => void;
  onOpenOrder: (id: number) => void;
};

export function StoreDashboard({ data, onEditStore, onViewOrders, onAddProduct, onOpenActionCentre, onOpenPerformance, onOpenStore, onOpenOrder }: StoreDashboardProps) {
  const { t } = useLanguage();
  return <View>
    <StoreOverview data={data} onEditStore={onEditStore} />
    <RevenueCard data={data} onPress={onOpenPerformance} />
    <StatsRow data={data} />
    <WorkspaceShortcuts onOpenStore={onOpenStore} onOpenPerformance={onOpenPerformance} onOpenActionCentre={onOpenActionCentre} />
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{t('dashboard.recentOrders')}</Text><Pressable onPress={onViewOrders} hitSlop={8}><Text style={styles.viewAll}>{t('dashboard.viewAll')}</Text></Pressable></View>
    {data.recentOrders.length ? data.recentOrders.slice(0, 6).map((order) => <OrderRow key={order.id} order={order} onPress={() => onOpenOrder(order.id)} />) : <EmptyOrders onPress={onViewOrders} />}
    <View style={styles.quickBlock}>
      <View style={styles.quickHeader}><View><Text style={styles.quickTitle}>{t('dashboard.keepMoving')}</Text><Text style={styles.quickText}>{t('dashboard.keepMovingCopy')}</Text></View><Pressable onPress={onOpenActionCentre}><MaterialCommunityIcons name="arrow-top-right" size={20} color={colors.blue} /></Pressable></View>
      <View style={styles.quickActions}><AppButton label={t('dashboard.addProduct')} onPress={onAddProduct} style={styles.halfButton} icon={<MaterialCommunityIcons name="package-variant-plus" size={17} color="#FFFFFF" />} /><AppButton label={t('dashboard.actionCentre')} variant="secondary" onPress={onOpenActionCentre} style={styles.halfButton} /></View>
    </View>
  </View>;
}

function StoreOverview({ data, onEditStore }: { data: DashboardSnapshot; onEditStore: () => void }) {
  const { t } = useLanguage();
  const coverContent = <><View style={styles.coverTint} /><View style={styles.coverCircleLarge} /><View style={styles.coverCircleSmall} /><View style={styles.coverTop}><Text numberOfLines={1} style={styles.coverLabel}>{data.storeName}</Text><MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" /></View></>;
  return <View style={styles.storeCard}>
    {data.store.banner_image_url ? <ImageBackground source={{ uri: data.store.banner_image_url }} imageStyle={styles.coverImage} style={styles.cover}>{coverContent}</ImageBackground> : <LinearGradient colors={gradients.storeCover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.75 }} style={styles.cover}>{coverContent}</LinearGradient>}
    <View style={styles.storeMark}>{data.store.profile_image_url ? <Image source={{ uri: data.store.profile_image_url }} style={styles.storePhoto} /> : <MaterialCommunityIcons name="glasses" size={27} color="#0F5CAD" />}</View>
    <View style={styles.storeInfo}><View style={styles.nameLine}><Text numberOfLines={1} style={styles.storeName}>{data.storeName}</Text>{data.store.can_sell ? <MaterialCommunityIcons name="check-decagram" size={17} color={colors.blue} /> : null}</View><View style={styles.metaLine}><Text style={styles.meta}>★ {data.rating} · {data.followers}</Text><Text numberOfLines={1} style={styles.meta}>{data.city}</Text></View><AppButton label={t('dashboard.editStore')} variant="secondary" onPress={onEditStore} icon={<MaterialCommunityIcons name="pencil-outline" size={16} color="#0F58BD" />} style={styles.editButton} /></View>
  </View>;
}

function RevenueCard({ data, onPress }: { data: DashboardSnapshot; onPress: () => void }) {
  const { t } = useLanguage();
  const positive = data.salesChange >= 0;
  return <Pressable onPress={onPress}><LinearGradient colors={gradients.revenue} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.revenueCard}><View><Text style={styles.revenueLabel}>{t('dashboard.todaySales')}</Text><Text style={styles.revenueValue}>{data.todaySales}</Text></View><View style={styles.trend}><MaterialCommunityIcons name={positive ? 'trending-up' : 'trending-down'} size={14} color={positive ? '#C5F5DC' : '#FFD3D6'} /><Text style={[styles.trendText, !positive && styles.trendDown]}>{positive ? '+' : ''}{data.salesChange.toFixed(1)}%</Text></View></LinearGradient></Pressable>;
}

function StatsRow({ data }: { data: DashboardSnapshot }) {
  const { t } = useLanguage();
  const stats = [{ value: data.toFulfil, label: t('dashboard.toFulfil'), color: colors.ink }, { value: data.availableEarnings, label: t('dashboard.available'), color: colors.green }, { value: data.lowStock, label: t('dashboard.lowStock'), color: colors.red }];
  return <View style={styles.stats}>{stats.map((stat) => <View key={stat.label} style={styles.statCard}><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text><Text style={styles.statLabel}>{stat.label}</Text></View>)}</View>;
}

function WorkspaceShortcuts({ onOpenStore, onOpenPerformance, onOpenActionCentre }: { onOpenStore: () => void; onOpenPerformance: () => void; onOpenActionCentre: () => void }) {
  const { t } = useLanguage();
  return <View style={styles.shortcutBlock}><View style={styles.shortcutHeading}><Text style={styles.shortcutTitle}>{t('dashboard.yourWorkspace')}</Text><Text style={styles.shortcutCopy}>{t('dashboard.jumpToAttention')}</Text></View><View style={styles.shortcutRow}><WorkspaceShortcut icon="storefront-outline" label={t('dashboard.shortcutStore')} onPress={onOpenStore} /><WorkspaceShortcut icon="chart-line" label={t('dashboard.shortcutPerformance')} onPress={onOpenPerformance} /><WorkspaceShortcut icon="clipboard-check-outline" label={t('dashboard.shortcutActionCentre')} onPress={onOpenActionCentre} /></View></View>;
}

function WorkspaceShortcut({ icon, label, onPress }: { icon: 'storefront-outline' | 'chart-line' | 'clipboard-check-outline'; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.shortcut}><View style={styles.shortcutIcon}><MaterialCommunityIcons name={icon} size={19} color={colors.blue} /></View><Text numberOfLines={1} style={styles.shortcutLabel}>{label}</Text></Pressable>;
}

function OrderRow({ order, onPress }: { order: RecentOrder; onPress: () => void }) {
  const icon = order.status === 'paid' ? 'package-variant-closed' : order.status === 'delivered' ? 'check-circle-outline' : 'glasses';
  return <Pressable onPress={onPress} style={styles.orderRow}><View style={styles.orderArt}><MaterialCommunityIcons name={icon} size={18} color="#416684" /></View><View style={styles.orderCopy}><Text numberOfLines={1} style={styles.orderTitle}>#{order.orderNo} · {order.customer}</Text><Text numberOfLines={1} style={styles.orderMeta}>{order.detail}</Text></View><View style={styles.orderEnd}><Text style={styles.orderTotal}>{order.total}</Text><MaterialCommunityIcons name="chevron-right" size={17} color="#91A0B3" /></View></Pressable>;
}

function EmptyOrders({ onPress }: { onPress: () => void }) {
  const { t } = useLanguage();
  return <Pressable onPress={onPress} style={styles.emptyOrders}><MaterialCommunityIcons name="clipboard-text-outline" size={19} color={colors.blue} /><Text style={styles.emptyText}>{t('dashboard.emptyOrders')}</Text></Pressable>;
}

const styles = StyleSheet.create({
  storeCard: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'visible', ...shadow.card }, cover: { height: 108, padding: 16, overflow: 'hidden', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md }, coverImage: { borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md }, coverTint: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(7,43,89,0.48)' }, coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, coverLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', flex: 1 }, coverCircleLarge: { position: 'absolute', width: 166, height: 61, right: -29, bottom: 12, borderWidth: 9, borderColor: 'rgba(255,255,255,0.33)', borderRadius: 84, transform: [{ rotate: '-19deg' }] }, coverCircleSmall: { position: 'absolute', width: 66, height: 66, right: 52, top: -27, borderWidth: 11, borderColor: 'rgba(255,255,255,0.13)', borderRadius: 33 }, storeMark: { position: 'absolute', left: 16, top: 78, width: 55, height: 55, borderRadius: 18, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#DFF0FD', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadow.card }, storePhoto: { width: '100%', height: '100%' }, storeInfo: { paddingTop: 34, paddingBottom: 12, paddingHorizontal: 16 }, nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 }, storeName: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.8, flexShrink: 1 }, metaLine: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, meta: { color: colors.muted, fontSize: 12, flexShrink: 1 }, editButton: { marginTop: 13 },
  revenueCard: { marginTop: 12, borderRadius: 16, padding: 14, minHeight: 96, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', shadowColor: '#0D366F', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 18, elevation: 6 }, revenueLabel: { color: '#C7DDFA', fontSize: 12, fontWeight: '700' }, revenueValue: { color: '#FFFFFF', fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -1.5, marginTop: 3 }, trend: { paddingVertical: 7, paddingHorizontal: 9, borderRadius: 9, flexDirection: 'row', gap: 3, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' }, trendText: { color: '#C5F5DC', fontSize: 12, fontWeight: '800' }, trendDown: { color: '#FFD3D6' },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 }, statCard: { flex: 1, minWidth: 0, minHeight: 65, borderRadius: 13, padding: 9, backgroundColor: colors.surface, ...shadow.card }, statValue: { fontSize: 17, fontWeight: '800', letterSpacing: -0.6 }, statLabel: { marginTop: 3, color: '#76869C', fontSize: 10, fontWeight: '600' }, shortcutBlock: { marginTop: 15, padding: 13, borderRadius: radius.md, backgroundColor: '#EEF5FF' }, shortcutHeading: { marginBottom: 11 }, shortcutTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' }, shortcutCopy: { color: colors.muted, fontSize: 11, marginTop: 2 }, shortcutRow: { flexDirection: 'row', gap: 8 }, shortcut: { flex: 1, minWidth: 0, paddingVertical: 9, paddingHorizontal: 5, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center' }, shortcutIcon: { height: 31, width: 31, borderRadius: 10, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, shortcutLabel: { color: '#264767', fontSize: 10, fontWeight: '800', marginTop: 5, textAlign: 'center' }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 17, marginBottom: 8 }, sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }, viewAll: { color: colors.blue, fontSize: 12, fontWeight: '800' }, orderRow: { padding: 10, marginTop: 7, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 13, ...shadow.card }, orderArt: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDEFFD' }, orderCopy: { flex: 1, minWidth: 0, marginLeft: 9 }, orderEnd: { alignItems: 'flex-end', marginLeft: 8 }, orderTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, orderMeta: { color: colors.subtle, fontSize: 11, marginTop: 3 }, orderTotal: { color: colors.ink, fontSize: 13, fontWeight: '800', marginLeft: 8 }, emptyOrders: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.surface, borderRadius: 13, ...shadow.card }, emptyText: { color: colors.muted, fontSize: 12, fontWeight: '600', flex: 1 },
  quickBlock: { marginTop: 16, padding: 14, borderRadius: radius.md, backgroundColor: '#EEF5FF' }, quickHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, quickTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' }, quickText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }, quickActions: { flexDirection: 'row', gap: 8, marginTop: 12 }, halfButton: { flex: 1 },
});
