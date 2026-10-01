import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { AppButton } from '../../components/ui/AppButton';
import { AppHeader } from '../../components/ui/AppHeader';
import { DateField } from '../../components/ui/DateField';
import { Screen } from '../../components/ui/Screen';
import { getErrorMessage, apiConfig } from '../../services/api/client';
import { sellerToolsService, type AdAnalytics, type AdBudgetTransaction, type AdCampaign, type AdMetric, type AdOptions, type AdProduct, type SellerPage } from '../../services/seller/tools.service';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { goBack } from '../../navigation/back';
import { colors, radius, shadow } from '../../theme/tokens';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { getActiveLanguage } from '../../features/i18n/translate';
import { apiLabel } from '../../features/i18n/apiLabels';
import type { Language } from '../../features/i18n/dictionaries/core';

type CampaignTab = 'analytics' | 'transactions';
type FilterStatus = '' | 'pending_payment' | 'payment_failed' | 'pending_review' | 'scheduled' | 'active' | 'paused' | 'completed' | 'exhausted' | 'cancelled' | 'rejected' | 'terminated' | 'invalid';
type LaunchMode = 'run_now' | 'schedule';
type BudgetType = 'daily' | 'total';
type PickerMode = 'date' | 'time' | null;

type BoostDraft = {
  productId: number;
  name: string;
  launchMode: LaunchMode;
  startsAt: string;
  endsAt: string;
  budgetType: BudgetType;
  budgetAmount: string;
  bidAmount: string;
  locations: string[];
  placements: string[];
};

const terminalStatuses = new Set(['completed', 'cancelled', 'rejected', 'terminated', 'exhausted', 'invalid']);
const STATUS_FILTERS: FilterStatus[] = ['', 'pending_payment', 'payment_failed', 'pending_review', 'scheduled', 'active', 'paused', 'completed', 'exhausted', 'cancelled', 'rejected', 'terminated', 'invalid'];

const label = (value?: string | null) => apiLabel('boost.value', value);
const localeTag = (language: Language) => (language === 'it' ? 'it-IT' : 'en-IE');
const money = (cents?: number | null) => new Intl.NumberFormat(localeTag(getActiveLanguage()), { style: 'currency', currency: 'EUR' }).format(Number(cents || 0) / 100);
const decimalMoney = (value?: string | number | null) => new Intl.NumberFormat(localeTag(getActiveLanguage()), { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
const percentage = (value?: number | null) => `${Number(value || 0).toFixed(2)}%`;
const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const apiOrigin = () => apiConfig.baseUrl.replace(/\/api$/, '');
const imageUrl = (path?: string | null) => !path ? undefined : /^https?:\/\//i.test(path) ? path : `${apiOrigin()}/${path.replace(/^\/+/, '')}`;
const nowLocal = () => dateToLocalInput(new Date());
const plusDaysLocal = (days: number) => dateToLocalInput(new Date(Date.now() + days * 86400000));

function dateToLocalInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function localInputDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatCampaignTime(value?: string | null, timezone?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone || localTimezone() }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

function makeUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function freshDraft(template?: Partial<BoostDraft>): BoostDraft {
  return {
    productId: 0,
    name: '',
    launchMode: 'run_now',
    startsAt: nowLocal(),
    endsAt: plusDaysLocal(7),
    budgetType: 'total',
    budgetAmount: '10.00',
    bidAmount: '0.50',
    locations: ['global'],
    placements: [],
    ...template,
  };
}

function templateFromParam(value?: string) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<BoostDraft>;
    return {
      ...parsed,
      productId: Number(parsed.productId || 0),
      locations: Array.isArray(parsed.locations) ? parsed.locations : ['global'],
      placements: Array.isArray(parsed.placements) ? parsed.placements : [],
    };
  } catch {
    return undefined;
  }
}

export function BoostCampaignListScreen() {
  const { t } = useLanguage();
  const [pageData, setPageData] = useState<SellerPage<AdCampaign> | null>(null);
  const [status, setStatus] = useState<FilterStatus>('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [productId, setProductId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPageData(await sellerToolsService.boostCampaignsPage({ page, per_page: 20, status: status || undefined, payment_status: paymentStatus || undefined, product_id: productId.trim() || undefined, from: from || undefined, to: to || undefined }));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [from, page, paymentStatus, productId, status, to]);

  useAutoRefresh(load, true, 15_000, `${status}:${paymentStatus}:${productId}:${from}:${to}:${page}`);
  const changeStatus = (value: FilterStatus) => { setStatus(value); setPage(1); };
  const changePaymentStatus = (value: string) => { setPaymentStatus(value); setPage(1); };

  const remove = (campaign: AdCampaign) => Alert.alert(t('boost.deleteTitle'), t('boost.deleteCopy'), [
    { text: 'Keep campaign', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => void (async () => {
      try {
        setDeleting(campaign.id);
        await sellerToolsService.deleteBoost(campaign.id);
        await load();
      } catch (cause) {
        setError(getErrorMessage(cause));
      } finally {
        setDeleting(null);
      }
    })() },
  ]);

  return <Screen contentStyle={styles.screenBottom}>
    <AppHeader title={t('boost.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => goBack('/(tabs)')} right={<Pressable accessibilityLabel={t('boost.create')} onPress={() => router.push({ pathname: '/boost-campaign-create', params: { session: String(Date.now()) } })} style={styles.headerAdd}><MaterialCommunityIcons name="plus" size={22} color="#3E5877" /></Pressable>} />
    <View style={styles.page}>
      <View style={styles.listHero}>
        <View style={styles.listHeroIcon}><MaterialCommunityIcons name="rocket-launch-outline" size={27} color="#FFFFFF" /></View>
        <View style={styles.listHeroCopy}><Text style={styles.overlineLight}>{t('boost.overline')}</Text><Text style={styles.listTitle}>{t('boost.heading')}</Text><Text style={styles.listSub}>{t('boost.copy')}</Text></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => <Pill key={filter} label={label(filter)} active={status === filter} onPress={() => changeStatus(filter)} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, styles.paymentFilters]}>
        <Pill label={t('boost.statAllPayments')} active={!paymentStatus} onPress={() => changePaymentStatus('')} />
        <Pill label={t('boost.statReserved')} active={paymentStatus === 'reserved'} onPress={() => changePaymentStatus('reserved')} />
        <Pill label={t('boost.statUnpaid')} active={paymentStatus === 'unpaid'} onPress={() => changePaymentStatus('unpaid')} />
        <Pill label={t('boost.statFailed')} active={paymentStatus === 'failed'} onPress={() => changePaymentStatus('failed')} />
        <Pill label={t('boost.statReleased')} active={paymentStatus === 'released'} onPress={() => changePaymentStatus('released')} />
      </ScrollView>
      <Pressable onPress={() => setFiltersOpen((value) => !value)} style={styles.moreFilters}><MaterialCommunityIcons name="tune-variant" size={18} color={colors.blue} /><Text style={styles.moreFiltersText}>{t(filtersOpen ? 'boost.hideAdvanced' : 'boost.moreFilters')}</Text><MaterialCommunityIcons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.blue} /></Pressable>
      {filtersOpen ? <View style={styles.advancedFilters}><Field label={t('boost.filterProductId')} value={productId} onChangeText={(value) => { setProductId(value.replace(/\D/g, '')); setPage(1); }} keyboardType="number-pad" placeholder={t('boost.filterProductIdPlaceholder')} /><DateField label={t('boost.filterStartsFrom')} value={from} onChange={(value) => { setFrom(value); setPage(1); }} /><DateField label={t('boost.filterStartsThrough')} value={to} onChange={(value) => { setTo(value); setPage(1); }} minimumDate={from ? new Date(`${from}T12:00:00`) : undefined} /><AppButton label={t('boost.clearAdvanced')} variant="text" onPress={() => { setProductId(''); setFrom(''); setTo(''); setPage(1); }} /></View> : null}
      {error ? <Failure message={error} retry={() => void load()} /> : null}
      {loading ? <Loading label={t('boost.loading')} /> : pageData?.data.length ? <View style={styles.list}>{pageData.data.map((campaign) => <BoostListCard key={campaign.id} campaign={campaign} deleting={deleting === campaign.id} onOpen={() => router.push({ pathname: '/boost-campaign/[id]', params: { id: String(campaign.id) } })} onDelete={() => remove(campaign)} />)}</View> : <Empty title={t('boost.emptyTitle')} copy={t('boost.emptyCopy')} action={t('boost.createShort')} onAction={() => router.push({ pathname: '/boost-campaign-create', params: { session: String(Date.now()) } })} />}
      {pageData ? <><View style={styles.pager}><Pressable disabled={pageData.current_page <= 1} onPress={() => setPage((value) => Math.max(1, value - 1))} style={[styles.pagerButton, pageData.current_page <= 1 && styles.disabled]}><MaterialCommunityIcons name="chevron-left" size={19} color={colors.blue} /></Pressable><Text style={styles.pagerText}>Page {pageData.current_page} of {pageData.last_page}</Text><Pressable disabled={pageData.current_page >= pageData.last_page} onPress={() => setPage((value) => Math.min(pageData.last_page, value + 1))} style={[styles.pagerButton, pageData.current_page >= pageData.last_page && styles.disabled]}><MaterialCommunityIcons name="chevron-right" size={19} color={colors.blue} /></Pressable></View><Text style={styles.count}>{pageData.total} {pageData.total === 1 ? 'campaign' : 'campaigns'} in your seller workspace</Text></> : null}
    </View>
  </Screen>;
}

function BoostListCard({ campaign, deleting, onOpen, onDelete }: { campaign: AdCampaign; deleting: boolean; onOpen: () => void; onDelete: () => void }) {
  const { t } = useLanguage();
  
  const productImage = imageUrl(campaign.product?.images?.[0]);
  return <Pressable onPress={onOpen} style={styles.boostCard}>
    <View style={styles.cardHead}>
      <View style={styles.productPreview}>{productImage ? <Image source={{ uri: productImage }} style={styles.productImage} /> : <MaterialCommunityIcons name="image-outline" size={22} color={colors.blue} />}</View>
      <View style={styles.cardHeadCopy}><Text numberOfLines={1} style={styles.cardName}>{campaign.name}</Text><Text numberOfLines={1} style={styles.cardProduct}>{campaign.product?.name || t('boost.productUnavailable')}</Text><Text style={styles.cardDate}>{formatCampaignTime(campaign.starts_at, campaign.schedule_timezone)} → {formatCampaignTime(campaign.ends_at, campaign.schedule_timezone)}</Text></View>
      <View style={styles.badges}><StatusBadge value={campaign.status} /><PaymentBadge value={campaign.payment_status} /></View>
    </View>
    <View style={styles.cardMoney}><MoneyBlock label={campaign.budget_type === 'daily' ? t('boost.dailyBudget') : t('boost.totalBudget')} value={money(campaign.budget_cents)} /><MoneyBlock label={t('boost.statSpent')} value={money(campaign.spent_cents)} /><MoneyBlock label={t('boost.statRemaining')} value={money(campaign.remaining_cents)} /></View>
    <View style={styles.cardMetrics}><CompactMetric icon="eye-outline" label={t('boost.statImpressions')} value={String(campaign.impressions || 0)} /><CompactMetric icon="cursor-default-click-outline" label={t('boost.statClicks')} value={`${campaign.clicks || 0} · ${percentage(campaign.ctr)}`} /><CompactMetric icon="cash-check" label={t('boost.statConversions')} value={`${campaign.conversions || 0} · ${money(campaign.revenue_cents)}`} /><CompactMetric icon="chart-line" label={t('boost.statRoas')} value={`${Number(campaign.roas || 0).toFixed(2)}×`} /></View>
    <View style={styles.cardFooter}><Text numberOfLines={1} style={styles.cardTargeting}>{(campaign.locations || []).join(', ') || t('boost.noLocations')} · {(campaign.placements || []).map(label).join(', ') || t('boost.noPlacements')}</Text><View style={styles.cardFooterActions}><Pressable accessibilityLabel={`Open ${campaign.name}`} onPress={onOpen} style={styles.iconAction}><MaterialCommunityIcons name="arrow-right" size={19} color={colors.blue} /></Pressable><Pressable accessibilityLabel={`Delete ${campaign.name}`} disabled={deleting} onPress={onDelete} style={styles.iconAction}><MaterialCommunityIcons name="delete-outline" size={19} color={colors.red} /></Pressable></View></View>
  </Pressable>;
}

export function BoostCampaignDetailsScreen() {
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const campaignId = Number(id);
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [analytics, setAnalytics] = useState<AdAnalytics | null>(null);
  const [transactions, setTransactions] = useState<SellerPage<AdBudgetTransaction> | null>(null);
  const [transactionPage, setTransactionPage] = useState(1);
  const [tab, setTab] = useState<CampaignTab>('analytics');
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId)) {
      setError(t('boost.invalidLink'));
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [nextCampaign, report, nextTransactions] = await Promise.all([
        sellerToolsService.boostCampaign(campaignId),
        sellerToolsService.boostAnalytics(campaignId),
        sellerToolsService.boostTransactions(campaignId, transactionPage),
      ]);
      setCampaign(nextCampaign);
      setAnalytics(report);
      setTransactions(nextTransactions);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [campaignId, transactionPage, t]);

  useAutoRefresh(load, true, 15_000, `${campaignId}:${transactionPage}`);

  const perform = async (action: 'pay' | 'pause' | 'resume' | 'cancel') => {
    if (!campaign) return;
    try {
      setBusyAction(action);
      await sellerToolsService.boostAction(campaign.id, action);
      await load();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusyAction(null);
    }
  };

  const remove = () => {
    if (!campaign) return;
    Alert.alert(t('boost.deleteTitle'), t('boost.deleteCopyList'), [
      { text: 'Keep campaign', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void (async () => {
        try {
          setBusyAction('delete');
          await sellerToolsService.deleteBoost(campaign.id);
          goBack('/boost-campaigns');
        } catch (cause) {
          setError(getErrorMessage(cause));
        } finally {
          setBusyAction(null);
        }
      })() },
    ]);
  };

  const duplicate = async () => {
    if (!campaign) return;
    try {
      setBusyAction('duplicate');
      const template = await sellerToolsService.duplicateBoost(campaign.id);
      const draft: Partial<BoostDraft> = {
        productId: Number(template.product_id || campaign.product_id),
        name: template.name || `${campaign.name} (copy)`,
        budgetType: template.budget_type === 'daily' ? 'daily' : 'total',
        budgetAmount: String(template.budget_amount || money(campaign.budget_amount_cents).replace(/[^0-9.,]/g, '').replace(',', '.')),
        bidAmount: String(template.bid_amount || money(campaign.bid_cents).replace(/[^0-9.,]/g, '').replace(',', '.')),
        locations: template.locations || campaign.locations || ['global'],
        placements: template.placements || campaign.placements || [],
      };
      router.push({ pathname: '/boost-campaign-create', params: { session: String(Date.now()), template: JSON.stringify(draft) } });
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusyAction(null);
    }
  };

  const summary = analytics?.summary || campaign;
  const productImage = imageUrl(summary?.product?.images?.[0]);
  return <Screen contentStyle={styles.screenBottom}>
    <AppHeader title={t('boost.detailsTitle')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => goBack('/boost-campaigns')} right={null} />
    <View style={styles.page}>{loading ? <Loading label={t('boost.detailsLoading')} /> : error && !campaign ? <Failure message={error} retry={() => void load()} /> : summary ? <>
      <BoostActionBar campaign={summary} busy={busyAction} onPay={() => void perform('pay')} onPause={() => void perform('pause')} onResume={() => void perform('resume')} onCancel={() => void perform('cancel')} onDelete={remove} onDuplicate={() => void duplicate()} />
      {error ? <Failure message={error} retry={() => void load()} /> : null}
      <View style={styles.detailHero}>
        <View style={styles.detailProductPreview}>{productImage ? <Image source={{ uri: productImage }} style={styles.detailProductImage} /> : <MaterialCommunityIcons name="rocket-launch-outline" size={30} color="#FFFFFF" />}</View>
        <View style={styles.detailHeroCopy}><Text numberOfLines={2} style={styles.detailName}>{summary.name}</Text><Text numberOfLines={2} style={styles.detailProduct}>{summary.product?.name || t('boost.productUnavailable')}</Text><View style={styles.detailBadges}><StatusBadge value={summary.status} inverse /><PaymentBadge value={summary.payment_status} inverse /></View></View>
      </View>
      <Text style={styles.sectionTitle}>{t('boost.sectionOverview')}</Text>
      <InfoCard><Detail label={t('boost.fieldCampaignId')} value={`#${summary.id}`} /><Detail label={t('boost.fieldProduct')} value={summary.product?.name || t('boost.unavailable')} /><Detail label={t('boost.fieldProductPrice')} value={decimalMoney(summary.product?.price)} /><Detail label={t('boost.fieldProductStock')} value={String(summary.product?.stock_quantity ?? 0)} /><Detail label={t('boost.fieldProductApproval')} value={summary.product?.is_approved ? t('boost.approved') : t('boost.notApproved')} /><Detail label={t('boost.fieldCampaignStatus')} value={label(summary.status)} /><Detail label={t('boost.fieldPaymentStatus')} value={label(summary.payment_status)} /><Detail label={t('boost.fieldPaymentMethod')} value={label(summary.payment_method)} /></InfoCard>
      <Text style={styles.sectionTitle}>{t('boost.sectionSchedule')}</Text>
      <InfoCard><Detail label={t('boost.fieldStarts')} value={formatCampaignTime(summary.starts_at, summary.schedule_timezone)} /><Detail label={t('boost.fieldEnds')} value={formatCampaignTime(summary.ends_at, summary.schedule_timezone)} /><Detail label={t('boost.fieldTimezone')} value={summary.schedule_timezone || 'UTC'} /><Detail label={t('boost.fieldLaunchSetting')} value={summary.starts_at && new Date(summary.starts_at) > new Date() ? t('boost.scheduledStart') : t('boost.runWhenApproved')} /><Detail label={t('boost.fieldLocations')} value={(summary.locations || []).join(', ') || '—'} /><Detail label={t('boost.fieldPlacements')} value={(summary.placements || []).map(label).join(', ') || '—'} /></InfoCard>
      <Text style={styles.sectionTitle}>{t('boost.sectionBudget')}</Text>
      <View style={styles.metricGrid}><MetricCard label={summary.budget_type === 'daily' ? t('boost.dailyBudget') : t('boost.totalBudget')} value={money(summary.budget_cents)} icon="wallet-outline" /><MetricCard label={t('boost.fieldReserved')} value={money(summary.reserved_cents)} icon="lock-outline" /><MetricCard label={t('boost.statSpent')} value={money(summary.spent_cents)} icon="cash-minus" /><MetricCard label={t('boost.statRemaining')} value={money(summary.remaining_cents)} icon="wallet-plus-outline" /></View>
      <InfoCard><Detail label={t('boost.fieldBudgetType')} value={label(summary.budget_type)} /><Detail label={t('boost.fieldBaseBudget')} value={money(summary.budget_amount_cents)} /><Detail label={t('boost.fieldBidType')} value={t('boost.fieldCpc')} /><Detail label={t('boost.fieldMaxCpc')} value={money(summary.bid_cents)} /><Detail label={t('boost.fieldAvgCpc')} value={money(summary.average_cpc_cents)} /><Detail label={t('boost.fieldReleasedToWallet')} value={money(summary.released_cents)} /><Detail label={t('boost.fieldFundingSource')} value={label(summary.funding_source || 'seller_wallet')} /><Detail label={t('boost.fieldWalletId')} value={summary.seller_wallet_id ? `#${summary.seller_wallet_id}` : t('boost.sellerWallet')} /></InfoCard>
      <Text style={styles.sectionTitle}>{t('boost.sectionPerformance')}</Text>
      <View style={styles.metricGrid}><MetricCard label={t('boost.statImpressions')} value={String(summary.impressions || 0)} icon="eye-outline" /><MetricCard label={t('boost.fieldUniqueImpressions')} value={String(summary.unique_impressions || 0)} icon="account-eye-outline" /><MetricCard label={t('boost.statClicks')} value={`${summary.clicks || 0} · ${percentage(summary.ctr)}`} icon="cursor-default-click-outline" /><MetricCard label={t('boost.fieldAvgCpc')} value={money(summary.average_cpc_cents)} icon="cash" /><MetricCard label={t('boost.fieldProductViews')} value={String(summary.product_views || 0)} icon="eye-plus-outline" /><MetricCard label={t('boost.fieldAddToCarts')} value={String(summary.add_to_carts || 0)} icon="cart-plus" /><MetricCard label={t('boost.statConversions')} value={String(summary.conversions || 0)} icon="check-decagram-outline" /><MetricCard label={t('boost.fieldConversionRate')} value={percentage(summary.conversion_rate)} icon="trending-up" /><MetricCard label={t('boost.fieldAttributedRevenue')} value={money(summary.revenue_cents)} icon="cash-check" /><MetricCard label={t('boost.statRoas')} value={`${Number(summary.roas || 0).toFixed(2)}×`} icon="chart-line" /></View>
      {summary.rejection_reason || summary.pause_source ? <><Text style={styles.sectionTitle}>{t('boost.sectionNotes')}</Text><InfoCard>{summary.rejection_reason ? <Detail label={t('boost.fieldReviewReason')} value={summary.rejection_reason} /> : null}{summary.pause_source ? <Detail label={t('boost.fieldPauseSource')} value={label(summary.pause_source)} /> : null}</InfoCard></> : null}
      {summary.legacy_snapshot ? <><Text style={styles.sectionTitle}>{t('boost.sectionSnapshot')}</Text><View style={styles.snapshot}><Text selectable style={styles.snapshotText}>{JSON.stringify(summary.legacy_snapshot, null, 2)}</Text></View></> : null}
      <Text style={styles.sectionTitle}>{t('boost.sectionReporting')}</Text>
      <View style={styles.tabs}><Tab label={t('boost.tabAnalytics')} active={tab === 'analytics'} onPress={() => setTab('analytics')} /><Tab label={t('boost.tabWalletActivity')} active={tab === 'transactions'} onPress={() => setTab('transactions')} /></View>
      {tab === 'analytics' ? <AnalyticsPanel analytics={analytics} /> : <TransactionsPanel page={transactions} loading={loading} onPrevious={() => setTransactionPage((value) => Math.max(1, value - 1))} onNext={() => setTransactionPage((value) => Math.min(transactions?.last_page || value, value + 1))} />}
    </> : null}</View>
  </Screen>;
}

function BoostActionBar({ campaign, busy, onPay, onPause, onResume, onCancel, onDelete, onDuplicate }: { campaign: AdCampaign; busy: string | null; onPay: () => void; onPause: () => void; onResume: () => void; onCancel: () => void; onDelete: () => void; onDuplicate: () => void }) {
  const { t } = useLanguage();
  
  const terminal = terminalStatuses.has(campaign.status);
  const canCancel = !terminal && campaign.status !== 'reconciliation_hold';
  const canPay = ['pending_payment', 'payment_failed'].includes(campaign.status);
  const canPause = ['active', 'scheduled'].includes(campaign.status);
  const canResume = campaign.status === 'paused' && campaign.pause_source !== 'admin';
  return <View style={styles.actionBar}><Text style={styles.actionBarLabel}>{t('boost.sectionActions')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionScroll}>{canPay ? <ActionPill label={busy === 'pay' ? t('boost.reserving') : t('boost.reserveAndPay')} icon="wallet-outline" onPress={onPay} disabled={Boolean(busy)} primary /> : null}{canPause ? <ActionPill label={t('boost.pause')} icon="pause" onPress={onPause} disabled={Boolean(busy)} /> : null}{canResume ? <ActionPill label={t('boost.resume')} icon="play" onPress={onResume} disabled={Boolean(busy)} primary /> : null}{canCancel ? <ActionPill label={t('boost.cancel')} icon="cancel" onPress={onCancel} disabled={Boolean(busy)} /> : null}{terminal ? <ActionPill label={busy === 'duplicate' ? t('boost.preparing') : t('boost.duplicateEdit')} icon="content-copy" onPress={onDuplicate} disabled={Boolean(busy)} primary /> : null}<ActionPill label={busy === 'delete' ? t('boost.deleting') : t('boost.delete')} icon="delete-outline" onPress={onDelete} disabled={Boolean(busy)} destructive /></ScrollView>{campaign.status === 'reconciliation_hold' ? <Text style={styles.actionHint}>{t('boost.actionsLocked')}</Text> : terminal ? <Text style={styles.actionHint}>{t('boost.actionsCompletedHint')}</Text> : null}</View>;
}

function AnalyticsPanel({ analytics }: { analytics: AdAnalytics | null }) {
  const { t } = useLanguage();
  
  if (!analytics) return <Loading label={t('boost.analyticsLoading')} compact />;
  return <View style={styles.reportPanel}><Text style={styles.reportHint}>Attribution uses the last click within {analytics.attribution_window_days} days.</Text><MetricReport title={t('boost.tabDaily')} dimension="day" rows={analytics.daily} /><MetricReport title={t('boost.tabPlacement')} dimension="placement" rows={analytics.placements} /><MetricReport title={t('boost.tabLocation')} dimension="location" rows={analytics.locations} /></View>;
}

function MetricReport({ title, dimension, rows }: { title: string; dimension: 'day' | 'placement' | 'location'; rows: AdMetric[] }) {
  const { t } = useLanguage();
  
  return <View style={styles.reportGroup}><Text style={styles.reportTitle}>{title}</Text>{rows.length ? rows.map((row, index) => <View key={`${row[dimension] || 'unknown'}-${index}`} style={styles.reportRow}><Text style={styles.reportDimension}>{row[dimension] || '—'}</Text><Text style={styles.reportValue}>{row.impressions} imp. · {row.clicks} clicks</Text><Text style={styles.reportValue}>{money(row.spent_cents)} · {row.conversions} conv. · {money(row.revenue_cents)}</Text></View>) : <Text style={styles.emptyReport}>{t('boost.noEvents')}</Text>}</View>;
}

function TransactionsPanel({ page, loading, onPrevious, onNext }: { page: SellerPage<AdBudgetTransaction> | null; loading: boolean; onPrevious: () => void; onNext: () => void }) {
  const { t } = useLanguage();
  
  if (loading && !page) return <Loading label={t('boost.walletLoading')} compact />;
  return <View style={styles.reportPanel}>{page?.data.length ? page.data.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />) : <Text style={styles.emptyReport}>{t('boost.noWalletTx')}</Text>}{page ? <View style={styles.pager}><Pressable disabled={page.current_page <= 1} onPress={onPrevious} style={[styles.pagerButton, page.current_page <= 1 && styles.disabled]}><MaterialCommunityIcons name="chevron-left" size={19} color={colors.blue} /></Pressable><Text style={styles.pagerText}>Page {page.current_page} of {page.last_page}</Text><Pressable disabled={page.current_page >= page.last_page} onPress={onNext} style={[styles.pagerButton, page.current_page >= page.last_page && styles.disabled]}><MaterialCommunityIcons name="chevron-right" size={19} color={colors.blue} /></Pressable></View> : null}</View>;
}

function TransactionRow({ transaction }: { transaction: AdBudgetTransaction }) {
  const { t } = useLanguage();
  
  const metadata = transaction.metadata || {};
  const source = String(metadata.funds_destination || metadata.funding_source || t('boost.sellerWallet'));
  return <View style={styles.transaction}><View style={styles.transactionIcon}><MaterialCommunityIcons name="wallet-outline" size={19} color={colors.blue} /></View><View style={styles.transactionCopy}><Text style={styles.transactionTitle}>{label(transaction.type)}</Text><Text style={styles.transactionSub}>{formatCampaignTime(transaction.created_at)} · {label(source)}</Text>{metadata.wallet_balance_before_cents !== undefined || metadata.wallet_balance_after_cents !== undefined ? <Text style={styles.transactionMeta}>Wallet {metadata.wallet_balance_before_cents !== undefined ? `${money(Number(metadata.wallet_balance_before_cents))} → ` : ''}{metadata.wallet_balance_after_cents !== undefined ? money(Number(metadata.wallet_balance_after_cents)) : ''}</Text> : null}</View><View><Text style={styles.transactionAmount}>{money(transaction.amount_cents)}</Text><Text style={styles.transactionBalance}>After: {money(transaction.balance_after_cents)}</Text></View></View>;
}

export function BoostCampaignCreateScreen() {
  const { session, template } = useLocalSearchParams<{ session?: string; template?: string }>();
  return <BoostCampaignCreateContent key={`${session || 'new'}:${template || ''}`} initialTemplate={templateFromParam(template)} />;
}

function BoostCampaignCreateContent({ initialTemplate }: { initialTemplate?: Partial<BoostDraft> }) {
  const { t } = useLanguage();
  
  const [draft, setDraft] = useState<BoostDraft>(() => freshDraft(initialTemplate));
  const [options, setOptions] = useState<AdOptions | null>(null);
  const [search, setSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [step, setStep] = useState(1);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) setLoadingOptions(true);
      void sellerToolsService.boostOptions({ search, page: productPage }).then((response) => { if (active) { setOptions(response); setError(null); } }).catch((cause) => { if (active) setError(getErrorMessage(cause)); }).finally(() => { if (active) setLoadingOptions(false); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [productPage, search]);

  const selectedProduct = options?.products.data.find((product) => product.id === draft.productId);
  const startDate = draft.launchMode === 'run_now' ? new Date() : localInputDate(draft.startsAt);
  const endDate = localInputDate(draft.endsAt);
  const dayCount = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime() - 1) / 86400000) + 1);
  const amountCents = Math.round(Number(draft.budgetAmount) * 100);
  const reserveCents = draft.budgetType === 'daily' ? amountCents * dayCount : amountCents;
  const availableCents = options?.seller_wallet_available_cents || 0;
  const validDates = Number.isFinite(startDate.getTime()) && Number.isFinite(endDate.getTime()) && endDate > startDate && dayCount > 0 && dayCount <= 90;
  const validBudget = amountCents >= 100 && Math.round(Number(draft.bidAmount) * 100) >= 1 && Number(draft.bidAmount) <= Number(draft.budgetAmount) && reserveCents <= 10_000_000;
  const patch = (value: Partial<BoostDraft>) => setDraft((current) => ({ ...current, ...value }));
  const toggle = (key: 'locations' | 'placements', value: string) => patch({ [key]: draft[key].includes(value) ? draft[key].filter((item) => item !== value) : [...draft[key], value] } as Partial<BoostDraft>);
  const validateStep = () => {
    if (step === 1 && !draft.productId) return 'Select a product to boost.';
    if (step === 2 && (!draft.name.trim() || !validBudget)) return !draft.name.trim() ? 'Enter a campaign name.' : 'Set a valid budget and CPC bid.';
    if (step === 3 && (!validDates || !draft.locations.length || !draft.placements.length)) return !validDates ? 'Choose a valid campaign period of up to 90 days.' : !draft.locations.length ? 'Choose global or at least one country.' : 'Choose at least one placement.';
    return null;
  };
  const next = () => { const validation = validateStep(); if (validation) { setError(validation); return; } setError(null); setStep((current) => Math.min(4, current + 1)); };
  const submit = async () => {
    const validation = validateStep();
    if (validation || !confirmed) { setError(validation || t('boost.errorReserve')); return; }
    try {
      setSaving(true);
      setError(null);
      await sellerToolsService.createBoost({
        product_id: draft.productId,
        name: draft.name.trim(),
        starts_at: (draft.launchMode === 'run_now' ? new Date() : startDate).toISOString(),
        ends_at: endDate.toISOString(),
        schedule_timezone: localTimezone(),
        launch_mode: draft.launchMode,
        budget_type: draft.budgetType,
        budget_amount: Number(draft.budgetAmount),
        bid_type: 'cpc',
        bid_amount: Number(draft.bidAmount),
        locations: draft.locations,
        placements: draft.placements,
        confirm_reservation: true,
        idempotency_key: makeUuid(),
      });
      router.replace('/boost-campaigns');
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return <Screen contentStyle={styles.screenBottom}>
    <AppHeader title={t('boost.newTitle')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => step > 1 ? setStep((current) => current - 1) : goBack('/boost-campaigns')} right={null} />
    <View style={styles.page}><StepBar active={step} />{initialTemplate ? <View style={styles.templateNotice}><MaterialCommunityIcons name="content-copy" size={18} color={colors.blue} /><Text style={styles.templateText}>{t('boost.duplicateHint')}</Text></View> : null}<Text style={styles.createTitle}>{[t('boost.stepProduct'), t('boost.stepBudget'), t('boost.stepTargeting'), t('boost.stepReview')][step - 1]}</Text><Text style={styles.createCopy}>{step === 1 ? t('boost.stepProductHint') : step === 2 ? t('boost.stepBudgetHint') : step === 3 ? t('boost.stepTargetingHint') : t('boost.stepReviewHint')}</Text>{error ? <Failure message={error} /> : null}{step === 1 ? <ProductStep options={options} loading={loadingOptions} search={search} productPage={productPage} selectedId={draft.productId} onSearch={(value) => { setSearch(value); setProductPage(1); }} onSelect={(product) => patch({ productId: product.id, name: draft.name || `${product.name} boost` })} onPrevious={() => setProductPage((value) => Math.max(1, value - 1))} onNext={() => setProductPage((value) => Math.min(options?.products.last_page || value, value + 1))} /> : null}{step === 2 ? <BudgetStep draft={draft} patch={patch} startDate={startDate} endDate={endDate} dayCount={dayCount} reserveCents={reserveCents} validDates={validDates} validBudget={validBudget} /> : null}{step === 3 ? <TargetingStep options={options} draft={draft} toggle={toggle} setLocations={(locations) => patch({ locations })} /> : null}{step === 4 ? <ReviewStep draft={draft} product={selectedProduct} options={options} startDate={startDate} endDate={endDate} reserveCents={reserveCents} confirmed={confirmed} onConfirm={setConfirmed} /> : null}<View style={styles.wizardActions}><AppButton label={step === 1 ? 'Cancel' : 'Back'} variant="secondary" onPress={() => step === 1 ? goBack('/boost-campaigns') : setStep((current) => current - 1)} style={styles.actionFlex} /><AppButton label={step === 4 ? saving ? 'Reserving…' : `Reserve ${money(reserveCents)}` : 'Continue'} disabled={saving || loadingOptions || (step === 4 && (!confirmed || reserveCents > availableCents))} onPress={() => step === 4 ? void submit() : next()} style={styles.actionFlex} /></View>{step === 4 && reserveCents > availableCents ? <View style={styles.walletWarning}><MaterialCommunityIcons name="wallet-outline" size={18} color={colors.amber} /><Text style={styles.walletWarningText}>Your Seller Wallet needs {money(reserveCents - availableCents)} more available balance to reserve this campaign.</Text></View> : null}</View>
  </Screen>;
}

function ProductStep({ options, loading, search, productPage, selectedId, onSearch, onSelect, onPrevious, onNext }: { options: AdOptions | null; loading: boolean; search: string; productPage: number; selectedId: number; onSearch: (value: string) => void; onSelect: (product: AdProduct) => void; onPrevious: () => void; onNext: () => void }) {
  const { t } = useLanguage();
  
  return <><View style={styles.search}><MaterialCommunityIcons name="magnify" size={19} color="#718096" /><TextInput value={search} onChangeText={onSearch} placeholder={t('boost.searchPlaceholder')} placeholderTextColor="#7C8BA0" style={styles.searchInput} /></View>{loading ? <Loading label={t('boost.loadingProducts')} compact /> : options?.products.data.length ? <View style={styles.productList}>{options.products.data.map((product) => <ProductChoice key={product.id} product={product} selected={selectedId === product.id} onPress={() => onSelect(product)} />)}</View> : <Empty title={t('boost.noProducts')} copy={t('boost.noProductsHint')} />}{options ? <View style={styles.pager}><Pressable disabled={productPage <= 1} onPress={onPrevious} style={[styles.pagerButton, productPage <= 1 && styles.disabled]}><MaterialCommunityIcons name="chevron-left" size={19} color={colors.blue} /></Pressable><Text style={styles.pagerText}>Page {options.products.current_page} of {options.products.last_page}</Text><Pressable disabled={productPage >= options.products.last_page} onPress={onNext} style={[styles.pagerButton, productPage >= options.products.last_page && styles.disabled]}><MaterialCommunityIcons name="chevron-right" size={19} color={colors.blue} /></Pressable></View> : null}</>;
}

function ProductChoice({ product, selected, onPress }: { product: AdProduct; selected: boolean; onPress: () => void }) {
  const { t } = useLanguage();
  
  const source = imageUrl(product.images?.[0]);
  return <Pressable onPress={onPress} style={[styles.productChoice, selected && styles.productChoiceSelected]}><View style={styles.productChoiceImage}>{source ? <Image source={{ uri: source }} style={styles.productImage} /> : <MaterialCommunityIcons name="image-outline" size={22} color={colors.blue} />}</View><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={styles.productChoiceName}>{product.name}</Text><Text style={styles.productChoiceMeta}>{decimalMoney(product.price)} · {t('boost.inStock', { count: product.stock_quantity })}</Text><Text style={styles.productChoiceState}>{product.is_approved ? t('boost.approvedEligible') : t('boost.notApproved')}</Text></View><MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={23} color={selected ? colors.blue : '#91A0B3'} /></Pressable>;
}

function BudgetStep({ draft, patch, startDate, endDate, dayCount, reserveCents, validDates, validBudget }: { draft: BoostDraft; patch: (value: Partial<BoostDraft>) => void; startDate: Date; endDate: Date; dayCount: number; reserveCents: number; validDates: boolean; validBudget: boolean }) {
  const { t } = useLanguage();
  
  return <><Field label={t('boost.nameLabel')} value={draft.name} onChangeText={(name) => patch({ name })} placeholder={t('boost.namePlaceholder')} /><Text style={styles.fieldLabel}>{t('boost.startQuestion')}</Text><View style={styles.choiceRow}><Choice label={t('boost.runNow')} active={draft.launchMode === 'run_now'} onPress={() => patch({ launchMode: 'run_now' })} /><Choice label={t('boost.scheduleLater')} active={draft.launchMode === 'schedule'} onPress={() => patch({ launchMode: 'schedule' })} /></View>{draft.launchMode === 'schedule' ? <DateTimeField label={t('boost.startDateTime')} value={draft.startsAt} onChange={(startsAt) => patch({ startsAt })} minimumDate={new Date()} /> : <Notice text={t('boost.runNowHint')} /> }<DateTimeField label={t('boost.endDateTime')} value={draft.endsAt} onChange={(endsAt) => patch({ endsAt })} minimumDate={draft.launchMode === 'schedule' ? startDate : new Date()} /><Text style={styles.fieldLabel}>{t('boost.fieldBudgetType')}</Text><View style={styles.choiceRow}><Choice label={t('boost.totalBudget')} active={draft.budgetType === 'total'} onPress={() => patch({ budgetType: 'total' })} /><Choice label={t('boost.dailyBudget')} active={draft.budgetType === 'daily'} onPress={() => patch({ budgetType: 'daily' })} /></View><Field label={draft.budgetType === 'daily' ? 'Daily budget (€)' : 'Campaign budget (€)'} value={draft.budgetAmount} onChangeText={(budgetAmount) => patch({ budgetAmount })} keyboardType="decimal-pad" placeholder="10.00" /><Field label={t('boost.maxCpcBid')} value={draft.bidAmount} onChangeText={(bidAmount) => patch({ bidAmount })} keyboardType="decimal-pad" placeholder="0.50" /><View style={styles.reserveCard}><MoneyBlock label={t('boost.reserveFromWallet')} value={money(reserveCents)} /><MoneyBlock label={t('boost.duration')} value={`${dayCount || 0} day${dayCount === 1 ? '' : 's'}`} /><MoneyBlock label={t('boost.localTimezone')} value={localTimezone()} /></View>{!validDates ? <Notice text={t('boost.durationHint')} danger /> : null}{!validBudget ? <Notice text={t('boost.budgetHint')} danger /> : null}<Text style={styles.timeHint}>Selected local time: {formatCampaignTime(draft.launchMode === 'schedule' ? startDate.toISOString() : new Date().toISOString(), localTimezone())} → {formatCampaignTime(endDate.toISOString(), localTimezone())}</Text></>;
}

function TargetingStep({ options, draft, toggle, setLocations }: { options: AdOptions | null; draft: BoostDraft; toggle: (key: 'locations' | 'placements', value: string) => void; setLocations: (locations: string[]) => void }) {
  const { t } = useLanguage();
  
  return <>{options ? <><Text style={styles.fieldLabel}>{t('boost.audienceLocation')}</Text><Choice label={t('boost.allCountries')} active={draft.locations.includes('global')} onPress={() => setLocations(draft.locations.includes('global') ? [] : ['global'])} /><Text style={styles.targetingHint}>{t('boost.specificCountries')}</Text><View style={styles.selector}>{options.locations.map((location) => <Pressable key={location.code} onPress={() => { if (draft.locations.includes('global')) setLocations([location.code]); else toggle('locations', location.code); }} style={styles.selectorRow}><MaterialCommunityIcons name={draft.locations.includes(location.code) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={colors.blue} /><Text style={styles.selectorText}>{location.name}</Text></Pressable>)}</View><Text style={styles.fieldLabel}>{t('boost.adPlacements')}</Text><View style={styles.selector}>{options.placements.map((placement) => <Pressable key={placement} onPress={() => toggle('placements', placement)} style={styles.selectorRow}><MaterialCommunityIcons name={draft.placements.includes(placement) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={colors.blue} /><Text style={styles.selectorText}>{label(placement)}</Text></Pressable>)}</View><Notice text={t('boost.targetingHint')} /></> : <Loading label={t('boost.targetingLoading')} compact />}</>;
}

function ReviewStep({ draft, product, options, startDate, endDate, reserveCents, confirmed, onConfirm }: { draft: BoostDraft; product?: AdProduct; options: AdOptions | null; startDate: Date; endDate: Date; reserveCents: number; confirmed: boolean; onConfirm: (value: boolean) => void }) {
  const { t } = useLanguage();
  
  return <><InfoCard><Detail label={t('boost.fieldProduct')} value={product?.name || `Product #${draft.productId}`} /><Detail label={t('boost.nameLabel')} value={draft.name || t('boost.untitled')} /><Detail label={t('boost.reviewSchedule')} value={draft.launchMode === 'run_now' ? `Run now → ${formatCampaignTime(endDate.toISOString(), localTimezone())}` : `${formatCampaignTime(startDate.toISOString(), localTimezone())} → ${formatCampaignTime(endDate.toISOString(), localTimezone())}`} /><Detail label={t('boost.reviewBudget')} value={`${money(Math.round(Number(draft.budgetAmount) * 100))} ${draft.budgetType === 'daily' ? 'per day' : 'total'}`} /><Detail label={t('boost.reviewCpc')} value={`Up to ${money(Math.round(Number(draft.bidAmount) * 100))}`} /><Detail label={t('boost.fieldLocations')} value={draft.locations.map(label).join(', ')} /><Detail label={t('boost.fieldPlacements')} value={draft.placements.map(label).join(', ')} /><Detail label={t('boost.walletAvailable')} value={money(options?.seller_wallet_available_cents)} /><Detail label={t('boost.alreadyReserved')} value={money(options?.seller_wallet_ad_reserved_cents)} /><Detail label={t('boost.newReservation')} value={money(reserveCents)} /></InfoCard><Notice text={options?.review_required ? t('boost.reviewNowHint') : t('boost.reviewLaterHint')} /><Pressable onPress={() => onConfirm(!confirmed)} style={styles.confirm}><MaterialCommunityIcons name={confirmed ? 'checkbox-marked' : 'checkbox-blank-outline'} size={23} color={colors.blue} /><Text style={styles.confirmText}>{t('boost.authorizeReserve', { amount: money(reserveCents) })}</Text></Pressable></>;
}

function DateTimeField({ label: fieldLabel, value, onChange, minimumDate }: { label: string; value: string; onChange: (value: string) => void; minimumDate?: Date }) {
  const [mode, setMode] = useState<PickerMode>(null);
  const dateValue = localInputDate(value);
  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setMode(null);
    if (event.type !== 'set' || !selected) return;
    const next = new Date(dateValue);
    if (mode === 'date') { next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate()); onChange(dateToLocalInput(next)); if (Platform.OS === 'android') setTimeout(() => setMode('time'), 0); }
    if (mode === 'time') { next.setHours(selected.getHours(), selected.getMinutes(), 0, 0); onChange(dateToLocalInput(next)); }
  };
  return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{fieldLabel}</Text><View style={styles.dateTimeRow}><Pressable onPress={() => setMode('date')} style={styles.dateTimeButton}><MaterialCommunityIcons name="calendar-outline" size={18} color={colors.blue} /><Text style={styles.dateTimeText}>{dateValue.toLocaleDateString(localeTag(getActiveLanguage()), { dateStyle: 'medium' })}</Text></Pressable><Pressable onPress={() => setMode('time')} style={styles.dateTimeButton}><MaterialCommunityIcons name="clock-outline" size={18} color={colors.blue} /><Text style={styles.dateTimeText}>{dateValue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></Pressable></View>{mode ? <DateTimePicker value={dateValue} mode={mode} display={Platform.OS === 'ios' ? 'inline' : 'default'} minimumDate={mode === 'date' ? minimumDate : undefined} onChange={onPickerChange} /> : null}</View>;
}

function StepBar({ active }: { active: number }) {
  const { t } = useLanguage();
  return <View style={styles.stepBar}>{[t('boost.fieldProduct'), t('boost.reviewBudget'), t('boost.stepTargeting'), t('boost.stepReview')].map((item, index) => <View key={item} style={styles.step}><View style={[styles.stepDot, index + 1 <= active && styles.stepDotActive]}><Text style={[styles.stepNumber, index + 1 <= active && styles.stepNumberActive]}>{index + 1}</Text></View><Text numberOfLines={1} style={[styles.stepText, index + 1 === active && styles.stepTextActive]}>{item}</Text></View>)}</View>;
}

function InfoCard({ children }: { children: React.ReactNode }) { return <View style={styles.infoCard}>{children}</View>; }
function Detail({ label: fieldLabel, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{fieldLabel}</Text><Text selectable style={styles.detailValue}>{value}</Text></View>; }
function MetricCard({ label: fieldLabel, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) { return <View style={styles.metricCard}><MaterialCommunityIcons name={icon} size={18} color={colors.blue} /><Text style={styles.metricCardValue}>{value}</Text><Text style={styles.metricCardLabel}>{fieldLabel}</Text></View>; }
function CompactMetric({ icon, label: metricLabel, value }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value: string }) { return <View style={styles.compactMetric}><MaterialCommunityIcons name={icon} size={15} color={colors.blue} /><Text style={styles.compactMetricLabel}>{metricLabel}</Text><Text style={styles.compactMetricValue}>{value}</Text></View>; }
function MoneyBlock({ label: blockLabel, value }: { label: string; value: string }) { return <View style={styles.moneyBlock}><Text style={styles.moneyBlockLabel}>{blockLabel}</Text><Text numberOfLines={1} style={styles.moneyBlockValue}>{value}</Text></View>; }
function StatusBadge({ value, inverse = false }: { value?: string | null; inverse?: boolean }) { return <View style={[styles.statusBadge, value === 'active' && styles.statusActive, inverse && styles.statusInverse]}><Text style={[styles.statusBadgeText, value === 'active' && styles.statusActiveText, inverse && styles.statusInverseText]}>{label(value)}</Text></View>; }
function PaymentBadge({ value, inverse = false }: { value?: string | null; inverse?: boolean }) { return <View style={[styles.paymentBadge, inverse && styles.paymentInverse]}><Text style={[styles.paymentBadgeText, inverse && styles.paymentInverseText]}>{label(value)}</Text></View>; }
function Pill({ label: pillLabel, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}><Text style={[styles.pillText, active && styles.pillTextActive]}>{pillLabel}</Text></Pressable>; }
function Choice({ label: choiceLabel, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{choiceLabel}</Text></Pressable>; }
function Tab({ label: tabLabel, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}><Text style={[styles.tabText, active && styles.tabTextActive]}>{tabLabel}</Text></Pressable>; }
function ActionPill({ label: actionLabel, icon, onPress, disabled, primary, destructive }: { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; onPress: () => void; disabled: boolean; primary?: boolean; destructive?: boolean }) { return <Pressable onPress={onPress} disabled={disabled} style={[styles.actionPill, primary && styles.actionPillPrimary, destructive && styles.actionPillDestructive, disabled && styles.disabled]}><MaterialCommunityIcons name={icon} size={17} color={primary ? '#FFFFFF' : destructive ? colors.red : colors.blue} /><Text style={[styles.actionPillText, primary && styles.actionPillPrimaryText, destructive && styles.actionPillDestructiveText]}>{actionLabel}</Text></Pressable>; }
function Field({ label: fieldLabel, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{fieldLabel}</Text><TextInput {...props} placeholderTextColor="#7C8BA0" style={styles.field} /></View>; }
function Notice({ text, danger }: { text: string; danger?: boolean }) { return <View style={[styles.notice, danger && styles.noticeDanger]}><MaterialCommunityIcons name={danger ? 'alert-circle-outline' : 'information-outline'} size={18} color={danger ? colors.red : colors.blue} /><Text style={[styles.noticeText, danger && styles.noticeDangerText]}>{text}</Text></View>; }
function Loading({ label: loadingLabel, compact = false }: { label: string; compact?: boolean }) { return <View style={[styles.loading, compact && styles.loadingCompact]}><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.loadingText}>{loadingLabel}</Text></View>; }
function Failure({ message, retry }: { message: string; retry?: () => void }) {
  const { t } = useLanguage();
  return <View style={styles.failure}><MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.red} /><View style={{ flex: 1 }}><Text style={styles.failureText}>{message}</Text>{retry ? <Pressable onPress={retry}><Text style={styles.retry}>{t('boost.tryAgain')}</Text></Pressable> : null}</View></View>; }
function Empty({ title, copy, action, onAction }: { title: string; copy: string; action?: string; onAction?: () => void }) { return <View style={styles.empty}><MaterialCommunityIcons name="rocket-launch-outline" size={35} color={colors.blue} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyCopy}>{copy}</Text>{action && onAction ? <AppButton label={action} onPress={onAction} style={styles.emptyAction} /> : null}</View>; }

const styles = StyleSheet.create({
  screenBottom: { paddingBottom: 124 }, page: { padding: 20 }, headerAdd: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.surface, ...shadow.card },
  listHero: { minHeight: 122, padding: 17, borderRadius: radius.lg, backgroundColor: colors.blue, flexDirection: 'row', gap: 13, alignItems: 'center' }, listHeroIcon: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.17)' }, listHeroCopy: { flex: 1, minWidth: 0 }, overlineLight: { color: '#BBD8FF', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 }, listTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 3 }, listSub: { color: '#D7E7FE', fontSize: 11, lineHeight: 16, marginTop: 4 },
  filterRow: { gap: 8, paddingVertical: 13 }, paymentFilters: { paddingTop: 0 }, pill: { minHeight: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: '#EAF0F7', justifyContent: 'center' }, pillActive: { backgroundColor: colors.blue }, pillText: { color: colors.muted, fontSize: 10, fontWeight: '800' }, pillTextActive: { color: '#FFFFFF' }, moreFilters: { minHeight: 38, paddingHorizontal: 11, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#EAF3FF', alignSelf: 'flex-start' }, moreFiltersText: { flex: 1, color: colors.blue, fontSize: 11, fontWeight: '800' }, advancedFilters: { padding: 12, borderRadius: radius.md, backgroundColor: '#EEF5FF', marginTop: 10 }, list: { gap: 11, marginTop: 12 }, count: { color: colors.subtle, fontSize: 10, textAlign: 'center', marginTop: 16 },
  boostCard: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card }, cardHead: { flexDirection: 'row', gap: 9, alignItems: 'center' }, productPreview: { height: 55, width: 55, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7F1FF' }, productImage: { width: '100%', height: '100%', resizeMode: 'contain' }, cardHeadCopy: { flex: 1, minWidth: 0 }, cardName: { color: colors.ink, fontSize: 13, fontWeight: '800' }, cardProduct: { color: colors.muted, fontSize: 10, marginTop: 2 }, cardDate: { color: colors.subtle, fontSize: 9, lineHeight: 13, marginTop: 4 }, badges: { alignItems: 'flex-end', gap: 4 }, statusBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: '#EEF2F6' }, statusActive: { backgroundColor: colors.greenSoft }, statusBadgeText: { color: '#526277', fontSize: 8, fontWeight: '800' }, statusActiveText: { color: colors.green }, paymentBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: '#FFF4DC' }, paymentBadgeText: { color: '#A46B14', fontSize: 8, fontWeight: '800' },
  cardMoney: { flexDirection: 'row', gap: 7, marginTop: 12 }, moneyBlock: { flex: 1, minWidth: 0, padding: 9, borderRadius: 11, backgroundColor: '#F2F6FC' }, moneyBlockLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', textTransform: 'uppercase' }, moneyBlockValue: { color: colors.ink, fontSize: 11, fontWeight: '800', marginTop: 3 }, cardMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }, compactMetric: { width: '48%', minHeight: 45, padding: 7, borderRadius: 10, backgroundColor: '#FAFBFE' }, compactMetricLabel: { color: colors.subtle, fontSize: 8, marginTop: 3 }, compactMetricValue: { color: colors.ink, fontSize: 10, fontWeight: '800', marginTop: 1 }, cardFooter: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderColor: '#E7EDF5' }, cardTargeting: { flex: 1, color: colors.subtle, fontSize: 9 }, cardFooterActions: { flexDirection: 'row', gap: 5 }, iconAction: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F2F6FC' },
  actionBar: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card }, actionBarLabel: { color: colors.subtle, fontSize: 9, fontWeight: '800', letterSpacing: 1 }, actionScroll: { gap: 8, paddingTop: 9, paddingRight: 6 }, actionPill: { minHeight: 39, paddingHorizontal: 11, borderRadius: 11, backgroundColor: '#EAF3FF', flexDirection: 'row', alignItems: 'center', gap: 6 }, actionPillPrimary: { backgroundColor: colors.blue }, actionPillDestructive: { backgroundColor: '#FFF0F1' }, actionPillText: { color: colors.blue, fontSize: 11, fontWeight: '800' }, actionPillPrimaryText: { color: '#FFFFFF' }, actionPillDestructiveText: { color: colors.red }, actionHint: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 9 },
  detailHero: { minHeight: 116, padding: 14, borderRadius: radius.lg, marginTop: 13, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', gap: 12 }, detailProductPreview: { width: 74, height: 74, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.18)' }, detailProductImage: { width: '100%', height: '100%', resizeMode: 'contain', backgroundColor: '#FFFFFF' }, detailHeroCopy: { flex: 1, minWidth: 0 }, detailName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' }, detailProduct: { color: '#DDEBFF', fontSize: 11, marginTop: 4 }, detailBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }, statusInverse: { backgroundColor: 'rgba(255,255,255,.18)' }, statusInverseText: { color: '#FFFFFF' }, paymentInverse: { backgroundColor: 'rgba(255,255,255,.13)' }, paymentInverseText: { color: '#DDEBFF' },
  sectionTitle: { color: '#718096', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 21, marginBottom: 8 }, infoCard: { paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card }, detail: { minHeight: 46, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderColor: '#E7EDF5' }, detailLabel: { flex: 1, color: colors.muted, fontSize: 11 }, detailValue: { maxWidth: '62%', color: colors.ink, fontSize: 11, lineHeight: 16, textAlign: 'right', fontWeight: '800' }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metricCard: { width: '48%', minHeight: 84, padding: 10, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card }, metricCardValue: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 7 }, metricCardLabel: { color: colors.subtle, fontSize: 9, marginTop: 3 }, snapshot: { padding: 12, borderRadius: radius.md, backgroundColor: '#112440' }, snapshotText: { color: '#D6E8FF', fontSize: 10, lineHeight: 15 },
  tabs: { flexDirection: 'row', gap: 7 }, tab: { flex: 1, minHeight: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#EAF0F7' }, tabActive: { backgroundColor: colors.blue }, tabText: { color: colors.muted, fontSize: 11, fontWeight: '800' }, tabTextActive: { color: '#FFFFFF' }, reportPanel: { marginTop: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card }, reportHint: { color: colors.muted, fontSize: 10, lineHeight: 15 }, reportGroup: { marginTop: 16 }, reportTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 5 }, reportRow: { paddingVertical: 9, borderBottomWidth: 1, borderColor: '#E8EDF4' }, reportDimension: { color: colors.ink, fontSize: 11, fontWeight: '800' }, reportValue: { color: colors.muted, fontSize: 10, marginTop: 3 }, emptyReport: { color: colors.muted, fontSize: 11, paddingVertical: 9 }, transaction: { minHeight: 68, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderColor: '#E8EDF4' }, transactionIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#E7F1FF', alignItems: 'center', justifyContent: 'center' }, transactionCopy: { flex: 1, minWidth: 0 }, transactionTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' }, transactionSub: { color: colors.muted, fontSize: 9, marginTop: 3 }, transactionMeta: { color: colors.subtle, fontSize: 8, marginTop: 3 }, transactionAmount: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'right' }, transactionBalance: { color: colors.subtle, fontSize: 8, marginTop: 3, textAlign: 'right' }, pager: { minHeight: 39, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 13, marginTop: 13 }, pagerButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#EAF3FF' }, pagerText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  stepBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }, step: { width: '24%', alignItems: 'center' }, stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3EAF3' }, stepDotActive: { backgroundColor: colors.blue }, stepNumber: { color: colors.muted, fontSize: 11, fontWeight: '800' }, stepNumberActive: { color: '#FFFFFF' }, stepText: { color: colors.subtle, fontSize: 8, marginTop: 4, textAlign: 'center' }, stepTextActive: { color: colors.blue, fontWeight: '800' }, templateNotice: { marginBottom: 15, padding: 10, borderRadius: 11, backgroundColor: '#EAF3FF', flexDirection: 'row', gap: 8 }, templateText: { flex: 1, color: '#285B96', fontSize: 10, lineHeight: 15, fontWeight: '700' }, createTitle: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.7 }, createCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, search: { minHeight: 48, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, ...shadow.card }, searchInput: { flex: 1, paddingVertical: 10, color: colors.ink, fontSize: 13 }, productList: { gap: 9, marginTop: 13 }, productChoice: { minHeight: 75, padding: 10, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow.card }, productChoiceSelected: { borderWidth: 1.5, borderColor: colors.blue, backgroundColor: '#F4F8FF' }, productChoiceImage: { height: 50, width: 50, overflow: 'hidden', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7F1FF' }, productChoiceName: { color: colors.ink, fontSize: 12, fontWeight: '800' }, productChoiceMeta: { color: colors.muted, fontSize: 10, marginTop: 3 }, productChoiceState: { color: colors.green, fontSize: 9, marginTop: 3, fontWeight: '800' },
  fieldGroup: { marginTop: 14 }, fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 6 }, field: { minHeight: 48, paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.surface, color: colors.ink, fontSize: 13, ...shadow.card }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 36, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#EAF0F7' }, choiceActive: { backgroundColor: colors.blue }, choiceText: { color: colors.muted, fontSize: 10, fontWeight: '800' }, choiceTextActive: { color: '#FFFFFF' }, dateTimeRow: { flexDirection: 'row', gap: 8 }, dateTimeButton: { flex: 1, minHeight: 48, paddingHorizontal: 10, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.surface, ...shadow.card }, dateTimeText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '700' }, reserveCard: { flexDirection: 'row', gap: 7, marginTop: 14 }, timeHint: { color: colors.subtle, fontSize: 10, lineHeight: 15, marginTop: 12 }, targetingHint: { color: colors.muted, fontSize: 10, marginTop: 12, marginBottom: 7 }, selector: { maxHeight: 235, overflow: 'hidden', borderRadius: 12, backgroundColor: colors.surface, ...shadow.card }, selectorRow: { minHeight: 43, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderColor: '#E8EDF4' }, selectorText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700' }, wizardActions: { flexDirection: 'row', gap: 9, marginTop: 25 }, actionFlex: { flex: 1 }, confirm: { minHeight: 65, padding: 12, borderRadius: 12, marginTop: 14, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'flex-start', gap: 9, ...shadow.card }, confirmText: { flex: 1, color: colors.ink, fontSize: 11, lineHeight: 16, fontWeight: '700' }, walletWarning: { padding: 11, borderRadius: 11, backgroundColor: colors.amberSoft, flexDirection: 'row', gap: 8, marginTop: 10 }, walletWarningText: { flex: 1, color: '#86550B', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  notice: { marginTop: 14, padding: 11, borderRadius: 11, backgroundColor: '#EAF3FF', flexDirection: 'row', gap: 8 }, noticeDanger: { backgroundColor: '#FFF0F1' }, noticeText: { flex: 1, color: '#285B96', fontSize: 11, lineHeight: 16, fontWeight: '700' }, noticeDangerText: { color: colors.red }, loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 }, loadingCompact: { minHeight: 130 }, loadingText: { color: colors.muted, fontSize: 12 }, failure: { padding: 11, borderRadius: 11, backgroundColor: '#FFF0F1', flexDirection: 'row', gap: 8, marginTop: 12 }, failureText: { color: colors.red, fontSize: 11, lineHeight: 16, fontWeight: '700' }, retry: { color: colors.red, fontSize: 11, fontWeight: '800', marginTop: 5, textDecorationLine: 'underline' }, empty: { minHeight: 220, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, gap: 8 }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', textAlign: 'center' }, emptyCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' }, emptyAction: { marginTop: 10 }, disabled: { opacity: 0.45 },
});
