import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppHeader } from '../../components/ui/AppHeader';
import { AppButton } from '../../components/ui/AppButton';
import { Screen } from '../../components/ui/Screen';
import { getErrorMessage } from '../../services/api/client';
import { getDashboardSnapshot, formatEuro } from '../../services/dashboard/dashboard.service';
import type { DashboardSnapshot, RevenuePoint } from '../../types/seller';
import { colors, gradients, radius, shadow } from '../../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { getActiveLanguage } from '../../features/i18n/translate';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { goBack } from '../../navigation/back';

function useWorkspaceData() {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    return getDashboardSnapshot().then((next) => { setData(next); setError(null); }).catch((cause) => setError(getErrorMessage(cause)));
  };
  useAutoRefresh(load);
  return { data, error, load };
}

function PageLoading({ error, retry }: { error: string | null; retry: () => void }) {
  const { t } = useLanguage();
  if (!error) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.blue} /></View>;
  return <View style={styles.errorState}><MaterialCommunityIcons name="cloud-alert-outline" size={24} color={colors.red} /><Text style={styles.errorTitle}>{t('common.couldNotRefresh')}</Text><Text style={styles.errorCopy}>{error}</Text><Text onPress={retry} style={styles.retry}>{t('common.retry')}</Text></View>;
}

function BackHeader({ title }: { title: string }) {
  return <AppHeader title={title} onLeftPress={() => goBack('/(tabs)')} left={<MaterialCommunityIcons name="arrow-left" size={21} color="#3E5877" />} right={<MaterialCommunityIcons name="dots-horizontal" size={22} color="#3E5877" />} />;
}

export function StorePerformanceScreen() {
  const { t } = useLanguage();
  const { data, error, load } = useWorkspaceData();
  const period = useMemo(() => {
    const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6);
    const label = (date: Date) => date.toLocaleDateString(getActiveLanguage() === 'it' ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
    return `${label(start)} – ${label(end)}`;
  }, []);
  return <Screen contentStyle={styles.performanceContent}><BackHeader title={t('perf.title')} />{!data ? <PageLoading error={error} retry={load} /> : <View style={styles.performanceBody}>
    <Text style={styles.period}>{period}</Text><Text style={styles.performanceTitle}>{t(data.monthlyRevenueChange >= 0 ? 'perf.salesUp' : 'perf.salesChanging')}</Text>
    <LinearGradient colors={gradients.revenue} style={styles.weekCard}><View><Text style={styles.weekLabel}>{t('perf.thisMonth')}</Text><Text style={styles.weekValue}>{formatEuro(data.monthlyRevenue)}</Text></View><View style={styles.weekTrend}><Text style={styles.weekTrendText}>{data.monthlyRevenueChange >= 0 ? '+' : ''}{data.monthlyRevenueChange.toFixed(1)}%</Text></View></LinearGradient>
    <TrendCard series={data.revenueSeries} />
    <AttentionRow icon="alert" iconBackground={colors.amberSoft} iconColor={colors.amber} title={t('perf.lowStock', { count: data.lowStock })} copy={t('perf.lowStockCopy')} onPress={() => router.push('/products')} />
    <AttentionRow icon="check" iconBackground={colors.greenSoft} iconColor={colors.green} title={t('perf.paidOrders', { count: data.paidOrders })} copy={t('perf.paidOrdersCopy')} onPress={() => router.push('/orders')} />
    <AppButton label={t('perf.openInsights')} onPress={() => router.push('/store-health')} style={styles.insightButton} />
  </View>}</Screen>;
}

function TrendCard({ series }: { series: RevenuePoint[] }) {
  const { t } = useLanguage();
  const max = Math.max(...series.map((point) => point.value), 1);
  return <View style={styles.trendCard}><View style={styles.trendTop}><View style={styles.trendIcon}><MaterialCommunityIcons name="trending-up" size={19} color={colors.blue} /></View><View><Text style={styles.trendTitle}>{t('perf.trendTitle')}</Text><Text style={styles.trendCaption}>{t('perf.trendCaption')}</Text></View></View><View style={styles.bars}>{series.length ? series.map((point, index) => <View key={`${point.label}-${index}`} style={styles.barColumn}><View style={[styles.bar, { height: Math.max(8, (point.value / max) * 48), backgroundColor: index === series.length - 2 ? colors.blue : '#B9D9F6' }]} /><Text style={styles.barLabel}>{point.label.charAt(0)}</Text></View>) : <Text style={styles.noSeries}>{t('perf.noSeries')}</Text>}</View></View>;
}

function AttentionRow({ icon, iconBackground, iconColor, title, copy, onPress }: { icon: 'alert' | 'check'; iconBackground: string; iconColor: string; title: string; copy: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.attentionRow}><View style={[styles.attentionIcon, { backgroundColor: iconBackground }]}><MaterialCommunityIcons name={icon} size={18} color={iconColor} /></View><View style={styles.attentionCopyBlock}><Text style={styles.attentionTitle}>{title}</Text><Text style={styles.attentionCopy}>{copy}</Text></View><MaterialCommunityIcons name="chevron-right" size={19} color={colors.ink} /></Pressable>;
}

export function ActionCentreScreen() {
  const { t } = useLanguage();
  const { data, error, load } = useWorkspaceData();
  return <Screen contentStyle={styles.tabsContent}><AppHeader title={t('action.headerTitle')} onLeftPress={() => goBack('/(tabs)')} left={<MaterialCommunityIcons name="arrow-left" size={21} color="#3E5877" />} right={<View style={styles.headerActions}><MaterialCommunityIcons name="diamond-stone" size={18} color="#3E5877" /></View>} />{!data ? <PageLoading error={error} retry={load} /> : <View style={styles.tabsBody}>
    <Text style={styles.actionTitle}>{t('action.title')}</Text>
    <ActionCard icon="alert" tone="amber" title={t('action.lowStockTitle', { count: data.lowStock })} copy={t('action.lowStockCopy')} onPress={() => router.push('/products')} />
    <ActionCard icon="currency-eur" tone="blue" title={t('action.fulfilTitle', { count: data.toFulfil })} copy={t('action.fulfilCopy')} onPress={() => router.push('/orders')} />
    <ActionCard icon="check" tone="green" title={t('action.paidTitle', { count: data.paidOrders })} copy={t('action.paidCopy')} onPress={() => router.push('/orders')} />
    <Text style={styles.quickAdd}>{t('action.quickAdd')}</Text><View style={styles.addRow}><QuickButton icon="package-variant-plus" label={t('action.quickProduct')} onPress={() => router.push('/products')} /><QuickButton icon="chart-timeline-variant" label={t('action.quickPerformance')} onPress={() => router.push('/store-performance')} /></View>
  </View>}</Screen>;
}

function ActionCard({ icon, tone, title, copy, onPress }: { icon: 'alert' | 'currency-eur' | 'check'; tone: 'amber' | 'blue' | 'green'; title: string; copy: string; onPress: () => void }) {
  const palette = { amber: [colors.amberSoft, colors.amber], blue: [colors.blueSoft, colors.blue], green: [colors.greenSoft, colors.green] } as const;
  return <Pressable onPress={onPress} style={styles.actionCard}><View style={[styles.actionIcon, { backgroundColor: palette[tone][0] }]}><MaterialCommunityIcons name={icon} size={18} color={palette[tone][1]} /></View><View style={styles.actionCopy}><Text style={styles.actionCardTitle}>{title}</Text><Text style={styles.actionCardText}>{copy}</Text></View><MaterialCommunityIcons name="chevron-right" size={18} color={colors.ink} /></Pressable>;
}

function QuickButton({ icon, label, onPress }: { icon: 'package-variant-plus' | 'chart-timeline-variant'; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.quickButton}><MaterialCommunityIcons name={icon} size={16} color={colors.blue} /><Text style={styles.quickButtonText}>+ {label}</Text></Pressable>;
}

export function StoreHealthScreen() {
  const { t } = useLanguage();
  const { data, error, load } = useWorkspaceData();
  return <Screen contentStyle={styles.tabsContent}><AppHeader title={t('health.title')} onLeftPress={() => goBack('/action-centre')} right={<MaterialCommunityIcons name="arrow-top-right" size={18} color="#3E5877" />} />{!data ? <PageLoading error={error} retry={load} /> : <View style={styles.tabsBody}>
    <Text style={styles.healthTitle}>{t('perf.thisMonth')}</Text><MiniChart series={data.revenueSeries} />
    <HealthMetric label={t('health.revenue')} copy={t('health.revenueCopy')} value={formatEuro(data.monthlyRevenue)} change={data.monthlyRevenueChange} /><HealthMetric label={t('health.orders')} copy={t('health.ordersCopy')} value={String(data.monthlyOrders)} /><HealthMetric label={t('health.followers')} copy={t('health.followersCopy')} value={String(data.monthlyFollowers)} />
    <AppButton label={t('health.fullAnalytics')} variant="secondary" onPress={() => router.push('/store-performance')} style={styles.analyticsButton} />
  </View>}</Screen>;
}

function MiniChart({ series }: { series: RevenuePoint[] }) {
  const max = Math.max(...series.map((point) => point.value), 1);
  return <View style={styles.miniChart}>{series.map((point, index) => <View key={`${point.label}-${index}`} style={styles.miniPoint}><View style={[styles.miniBar, { height: Math.max(3, (point.value / max) * 36) }]} /></View>)}</View>;
}

function HealthMetric({ label, copy, value, change }: { label: string; copy: string; value: string; change?: number }) {
  return <View style={styles.healthMetric}><View><Text style={styles.healthLabel}>{label}</Text><Text style={styles.healthCopy}>{copy}</Text></View><View style={styles.healthEnd}><Text style={styles.healthValue}>{value}</Text>{change !== undefined ? <Text style={[styles.healthChange, change < 0 && { color: colors.red }]}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</Text> : null}</View></View>;
}

const styles = StyleSheet.create({
  performanceContent: { paddingBottom: 34 }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, performanceBody: { paddingHorizontal: 20, paddingTop: 20 }, tabsContent: { paddingBottom: 128 }, tabsBody: { paddingHorizontal: 20 }, loading: { minHeight: 340, justifyContent: 'center', alignItems: 'center' }, errorState: { margin: 24, padding: 18, borderRadius: radius.md, alignItems: 'center', backgroundColor: '#FFF0F1' }, errorTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 8 }, errorCopy: { color: '#9C454B', textAlign: 'center', fontSize: 12, lineHeight: 17, marginTop: 4 }, retry: { color: colors.blue, fontSize: 13, fontWeight: '800', marginTop: 12 },
  period: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }, performanceTitle: { color: colors.ink, fontSize: 25, letterSpacing: -1, fontWeight: '800', marginTop: 9, marginBottom: 19 }, weekCard: { padding: 15, minHeight: 75, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow.card }, weekLabel: { color: '#D4E5FC', fontSize: 11, fontWeight: '700' }, weekValue: { color: '#FFFFFF', fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -1.1, marginTop: 2 }, weekTrend: { paddingVertical: 9, paddingHorizontal: 10, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.14)' }, weekTrendText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, trendCard: { marginTop: 11, borderRadius: radius.md, padding: 14, backgroundColor: colors.surface, ...shadow.card }, trendTop: { flexDirection: 'row', gap: 10, alignItems: 'center' }, trendIcon: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.soft }, trendTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, trendCaption: { color: colors.muted, fontSize: 10, marginTop: 3 }, bars: { height: 70, flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 10 }, barColumn: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 3 }, bar: { width: '100%', borderRadius: 3 }, barLabel: { color: colors.subtle, fontSize: 9 }, noSeries: { color: colors.muted, fontSize: 11, lineHeight: 16, paddingVertical: 10 },
  attentionRow: { marginTop: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', ...shadow.card }, attentionIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }, attentionCopyBlock: { flex: 1, marginLeft: 10 }, attentionTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, attentionCopy: { color: colors.muted, fontSize: 10, marginTop: 4 }, insightButton: { marginTop: 10 },
  actionTitle: { color: colors.ink, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -1, marginTop: 18, marginBottom: 7 }, actionCard: { marginTop: 10, padding: 12, minHeight: 70, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', ...shadow.card }, actionIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' }, actionCopy: { flex: 1, marginLeft: 10 }, actionCardTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, actionCardText: { color: colors.muted, fontSize: 10, marginTop: 4 }, quickAdd: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 20, marginBottom: 11 }, addRow: { flexDirection: 'row', gap: 9 }, quickButton: { flex: 1, minHeight: 40, borderRadius: 11, backgroundColor: '#E9F1FE', flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' }, quickButtonText: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  healthTitle: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -1, marginTop: 18 }, miniChart: { height: 64, flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 15, paddingHorizontal: 5, paddingBottom: 8, borderRadius: 12, backgroundColor: colors.surface }, miniPoint: { flex: 1, height: 42, justifyContent: 'flex-end' }, miniBar: { backgroundColor: colors.blue, borderRadius: 4, opacity: 0.88 }, healthMetric: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, healthLabel: { color: colors.ink, fontSize: 12, fontWeight: '800' }, healthCopy: { color: colors.muted, fontSize: 10, marginTop: 4 }, healthEnd: { alignItems: 'flex-end' }, healthValue: { color: colors.ink, fontSize: 13, fontWeight: '800' }, healthChange: { color: colors.green, fontSize: 10, fontWeight: '800', marginTop: 3 }, analyticsButton: { marginTop: 16 },
});
