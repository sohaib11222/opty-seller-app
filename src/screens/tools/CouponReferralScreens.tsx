import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { AppButton } from '../../components/ui/AppButton';
import { AppHeader } from '../../components/ui/AppHeader';
import { Screen } from '../../components/ui/Screen';
import { getErrorMessage } from '../../services/api/client';
import { sellerToolsService, type CouponTarget, type CouponUsage, type ReferralCampaign, type ReferralReward, type SellerCoupon } from '../../services/seller/tools.service';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { goBack } from '../../navigation/back';
import { colors, radius, shadow } from '../../theme/tokens';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { getActiveLanguage, translate } from '../../features/i18n/translate';
import { apiLabel } from '../../features/i18n/apiLabels';
import type { Language } from '../../features/i18n/dictionaries/core';

type CouponScope = 'store' | 'products' | 'categories' | 'variants';
type CouponDraft = {
  code: string; description: string; discountType: 'percentage' | 'fixed_amount' | 'free_shipping'; discountValue: string; minimumOrder: string; scope: CouponScope;
  targetIds: number[]; usageLimit: string; usagePerUser: string; launchMode: 'run_now' | 'schedule'; startsAt: string; endsAt: string;
  isPublic: boolean; followersOnly: boolean; firstOrderOnly: boolean; isActive: boolean;
};
type ReferralDraft = {
  name: string; scope: 'store' | 'products' | 'categories' | 'mixed'; rewardType: 'fixed' | 'percentage'; rewardAmount: string; maxReward: string;
  budget: string; minimumOrder: string; minimumQuantity: string; usageLimit: string; monthlyLimit: string; perBuyerLimit: string;
  newCustomersOnly: boolean; stacking: 'exclusive' | 'allow_platform'; activation: 'immediate' | 'scheduled'; startsAt: string; endsAt: string;
  productIds: number[]; categoryIds: number[];
};
type PickerMode = 'date' | 'time' | null;

const couponStatuses = ['', 'active', 'scheduled', 'paused', 'inactive', 'expired', 'exhausted', 'archived'];
const readable = (value?: string | null) => apiLabel('promotions.value', value);
const localeTag = (language: Language) => (language === 'it' ? 'it-IT' : 'en-IE');
const euro = (value?: string | number | null) => new Intl.NumberFormat(localeTag(getActiveLanguage()), { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const localValue = (date: Date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-') + 'T' + [String(date.getHours()).padStart(2, '0'), String(date.getMinutes()).padStart(2, '0')].join(':');
const localDate = (value?: string | null) => {
  const result = value ? new Date(value) : new Date();
  return Number.isNaN(result.getTime()) ? new Date() : result;
};
const localInputFromApi = (value?: string | null) => localValue(localDate(value));
const iso = (value: string) => localDate(value).toISOString();
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat(localeTag(getActiveLanguage()), { dateStyle: 'medium', timeStyle: 'short' }).format(localDate(value)) : translate('promotions.notSet');
const nullableNumber = (value: string) => value.trim() === '' ? null : Number(value);
const plusDays = (days: number) => { const next = new Date(); next.setDate(next.getDate() + days); return localValue(next); };
const toggleId = (values: number[], id: number) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
const freshCoupon = (): CouponDraft => ({ code: '', description: '', discountType: 'percentage', discountValue: '', minimumOrder: '', scope: 'store', targetIds: [], usageLimit: '', usagePerUser: '', launchMode: 'run_now', startsAt: localValue(new Date()), endsAt: plusDays(7), isPublic: true, followersOnly: false, firstOrderOnly: false, isActive: true });
const freshReferral = (): ReferralDraft => ({ name: '', scope: 'store', rewardType: 'fixed', rewardAmount: '', maxReward: '', budget: '', minimumOrder: '', minimumQuantity: '1', usageLimit: '', monthlyLimit: '', perBuyerLimit: '', newCustomersOnly: true, stacking: 'exclusive', activation: 'immediate', startsAt: localValue(new Date()), endsAt: plusDays(30), productIds: [], categoryIds: [] });

function couponDraftFrom(row: SellerCoupon): CouponDraft {
  const targets = row.scope === 'products' ? row.products : row.scope === 'categories' ? row.categories : row.variants;
  return {
    code: row.code, description: row.description || '', discountType: row.discount_type, discountValue: String(row.discount_value ?? ''),
    minimumOrder: row.min_order_amount == null ? '' : String(row.min_order_amount), scope: row.scope, targetIds: (targets ?? []).map((item) => item.id),
    usageLimit: row.usage_limit == null ? '' : String(row.usage_limit), usagePerUser: row.usage_per_user == null ? '' : String(row.usage_per_user),
    launchMode: row.status === 'scheduled' ? 'schedule' : 'run_now', startsAt: localInputFromApi(row.starts_at), endsAt: row.ends_at ? localInputFromApi(row.ends_at) : '',
    isPublic: row.is_public !== false, followersOnly: Boolean(row.followers_only), firstOrderOnly: Boolean(row.first_order_only), isActive: row.is_active,
  };
}

function referralDraftFrom(row: ReferralCampaign): ReferralDraft {
  return {
    name: row.name, scope: row.scope_type, rewardType: row.reward_type === 'percentage' ? 'percentage' : 'fixed', rewardAmount: String(row.reward_amount || ''),
    maxReward: row.max_reward_per_order == null ? '' : String(row.max_reward_per_order), budget: String(row.budget_amount || ''),
    minimumOrder: row.minimum_order_amount == null ? '' : String(row.minimum_order_amount), minimumQuantity: String(row.minimum_quantity ?? 1),
    usageLimit: row.usage_limit == null ? '' : String(row.usage_limit), monthlyLimit: row.monthly_reward_limit == null ? '' : String(row.monthly_reward_limit),
    perBuyerLimit: row.per_buyer_limit == null ? '' : String(row.per_buyer_limit), newCustomersOnly: row.new_customer_only !== false,
    stacking: row.platform_stacking === 'allow_platform' ? 'allow_platform' : 'exclusive', activation: row.activation_mode === 'scheduled' ? 'scheduled' : 'immediate',
    startsAt: localInputFromApi(row.starts_at), endsAt: row.ends_at ? localInputFromApi(row.ends_at) : '', productIds: (row.products ?? []).map((item) => item.id), categoryIds: (row.categories ?? []).map((item) => item.id),
  };
}

export function CouponListScreen() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<SellerCoupon[]>([]);
  const [statistics, setStatistics] = useState<Record<string, number | string>>({});
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [type, setType] = useState(''); const [scope, setScope] = useState('');
  const [page, setPage] = useState(1); const [lastPage, setLastPage] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await sellerToolsService.couponsPage({ search: search.trim() || undefined, status: status || undefined, type: type || undefined, scope: scope || undefined, page, per_page: 25 });
      setRows(result.coupons?.data ?? []); setLastPage(result.coupons?.last_page ?? 1); setStatistics(result.statistics ?? {});
    } catch (cause) { setError(getErrorMessage(cause)); } finally { setLoading(false); }
  }, [page, scope, search, status, type]);
  useAutoRefresh(load, true, 15_000, [search, status, type, scope, page].join(':'));
  const start = () => router.push({ pathname: '/coupon-create', params: { session: String(Date.now()) } });
  return <Screen contentStyle={styles.bottom}>
    <AppHeader title={t('coupon.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => goBack('/(tabs)')} right={<Pressable accessibilityLabel={t('coupon.create')} style={styles.headerAdd} onPress={start}><MaterialCommunityIcons name="plus" size={22} color="#3E5877" /></Pressable>} />
    <View style={styles.body}>
      <Text style={styles.overline}>{t('coupon.overline')}</Text><Text style={styles.heading}>{t('coupon.heading')}</Text><Text style={styles.copy}>{t('coupon.copy')}</Text>
      <View style={styles.metrics}>{[
        [t('coupon.statTotalCoupons'), statistics.total_coupons], [t('coupon.statActive'), statistics.active_coupons], [t('coupon.statRedeemed'), statistics.redeemed_coupons], [t('coupon.statReserved'), statistics.reserved_coupons],
        [t('coupon.statTotalUses'), statistics.total_usages], [t('coupon.statDiscounts'), euro(statistics.total_discount_given)], [t('coupon.statRevenue'), euro(statistics.revenue_generated)], [t('coupon.statConversions'), statistics.conversion_count ?? statistics.order_count],
      ].map(([label, value]) => <Metric key={String(label)} label={String(label)} value={String(value ?? 0)} />)}</View>
      <View style={styles.search}><MaterialCommunityIcons name="magnify" size={19} color="#718096" /><TextInput value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder={t('coupon.searchPlaceholder')} placeholderTextColor="#7C8BA0" style={styles.searchInput} /></View>
      <FilterRail current={status} values={couponStatuses} allLabel={t('coupon.allStatuses')} onChange={(value) => { setStatus(value); setPage(1); }} />
      <FilterRail current={type} values={['', 'percentage', 'fixed_amount', 'free_shipping']} allLabel={t('coupon.allTypes')} onChange={(value) => { setType(value); setPage(1); }} />
      <FilterRail current={scope} values={['', 'store', 'products', 'categories', 'variants']} allLabel={t('coupon.allScopes')} onChange={(value) => { setScope(value); setPage(1); }} />
      {error ? <Failure message={error} /> : null}
      {loading ? <Loading label={t('coupon.loading')} /> : rows.length ? <><View style={styles.list}>{rows.map((row) => <CouponCard key={row.id} row={row} onPress={() => router.push({ pathname: '/coupon/[id]', params: { id: String(row.id) } })} />)}</View>{lastPage > 1 ? <Pagination page={page} lastPage={lastPage} onChange={setPage} /> : null}</> : <Empty title={t('coupon.emptyTitle')} copy={t('coupon.emptyCopy')} action={t('coupon.create')} onAction={start} />}
    </View>
  </Screen>;
}

function CouponCard({ row, onPress }: { row: SellerCoupon; onPress: () => void }) {
  const { t } = useLanguage();
  const status = row.resolved_status || row.status;
  const usage = row.usages_count ?? row.usage_count ?? 0;
  return <Pressable onPress={onPress} style={styles.card}>
    <View style={styles.cardIcon}><MaterialCommunityIcons name="ticket-percent-outline" size={23} color={colors.blue} /></View>
    <View style={styles.cardCopy}><View style={styles.rowTop}><Text numberOfLines={1} style={styles.cardTitle}>{row.code}</Text><Status value={status} /></View><Text numberOfLines={1} style={styles.cardText}>{row.description || t('coupon.noDescription')}</Text><Text style={styles.cardMeta}>{couponDiscount(row)} · {readable(row.scope)}</Text><Text style={styles.cardMeta}>{usage} / {row.usage_limit ?? '∞'} uses · {dateTime(row.ends_at)}</Text></View><MaterialCommunityIcons name="chevron-right" size={21} color="#8B9AAF" />
  </Pressable>;
}

export function CouponDetailsScreen() {
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string }>(); const couponId = Number(id);
  const [coupon, setCoupon] = useState<SellerCoupon | null>(null); const [usages, setUsages] = useState<CouponUsage[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!Number.isFinite(couponId) || couponId < 1) { setError(t('coupon.invalidLink')); setLoading(false); return; }
    try { setError(null); const [row, history] = await Promise.all([sellerToolsService.coupon(couponId), sellerToolsService.couponUsageHistory(couponId, { per_page: 25 }).catch(() => null)]); setCoupon(row); setUsages(history?.data ?? []); }
    catch (cause) { setError(getErrorMessage(cause)); } finally { setLoading(false); }
  }, [couponId, t]);
  useAutoRefresh(load, true, 15_000, String(couponId));
  const action = async (name: 'pause' | 'resume' | 'toggle-status' | 'archive') => {
    try { setBusy(true); setError(null); if (name === 'archive') { await sellerToolsService.deleteCoupon(couponId); router.replace('/coupons'); return; } await sellerToolsService.couponAction(couponId, name); await load(); }
    catch (cause) { setError(getErrorMessage(cause)); } finally { setBusy(false); }
  };
  const archive = () => Alert.alert(t('coupon.archiveTitle'), t('coupon.archiveCopyStopped'), [{ text: t('promotions.cancel'), style: 'cancel' }, { text: t('promotions.archive'), style: 'destructive', onPress: () => void action('archive') }]);
  return <Screen contentStyle={styles.bottom}>
    <AppHeader title={t('coupon.detailsTitle')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => goBack('/coupons')} right={null} />
    <View style={styles.body}>{loading ? <Loading label={t('coupon.detailsLoading')} /> : error && !coupon ? <Failure message={error} /> : coupon ? <>
      <View style={styles.topActions}><ActionPill label={t('promotions.edit')} icon="pencil-outline" primary disabled={busy || coupon.status === 'archived'} onPress={() => router.push({ pathname: '/coupon-create', params: { id: String(coupon.id) } })} />{coupon.status === 'paused' ? <ActionPill label={t('promotions.resume')} icon="play-circle-outline" disabled={busy} onPress={() => void action('resume')} /> : coupon.status !== 'archived' ? <ActionPill label={t('promotions.pause')} icon="pause-circle-outline" disabled={busy} onPress={() => void action('pause')} /> : null}<ActionPill label={t(coupon.is_active ? 'promotions.deactivate' : 'promotions.activate')} icon={coupon.is_active ? 'power' : 'power'} disabled={busy || coupon.status === 'archived'} onPress={() => void action('toggle-status')} /><ActionPill label={t('promotions.archive')} icon="archive-outline" destructive disabled={busy || coupon.status === 'archived'} onPress={archive} /></View>
      {error ? <Failure message={error} /> : null}
      <View style={styles.detailHero}><View style={styles.detailHeroIcon}><MaterialCommunityIcons name="ticket-percent-outline" size={30} color="#FFFFFF" /></View><View style={styles.detailHeroCopy}><Text style={styles.detailName}>{coupon.code}</Text><Text style={styles.detailSub}>{couponDiscount(coupon)} · {readable(coupon.scope)}</Text><Status value={coupon.resolved_status || coupon.status} /></View></View>
      {coupon.description ? <Text style={styles.description}>{coupon.description}</Text> : null}
      <Text style={styles.section}>{t('coupon.sectionRules')}</Text>
      <Detail label={t('coupon.fieldDiscount')} value={couponDiscount(coupon)} /><Detail label={t('coupon.fieldScope')} value={readable(coupon.scope)} /><Detail label={t('coupon.fieldMinSubtotal')} value={coupon.min_order_amount == null ? t('promotions.none') : euro(coupon.min_order_amount)} /><Detail label={t('coupon.totalUsageLimit')} value={coupon.usage_limit == null ? t('promotions.unlimited') : String(coupon.usage_limit)} /><Detail label={t('coupon.fieldPerBuyerLimit')} value={coupon.usage_per_user == null ? t('promotions.unlimited') : String(coupon.usage_per_user)} />
      <Text style={styles.section}>{t('coupon.sectionStatus')}</Text>
      <Detail label={t('coupon.fieldStatus')} value={readable(coupon.resolved_status || coupon.status)} /><Detail label={t('coupon.fieldEnabled')} value={coupon.is_active ? t('promotions.yes') : t('promotions.no')} /><Detail label={t('coupon.fieldStarts')} value={dateTime(coupon.starts_at)} /><Detail label={t('coupon.fieldEnds')} value={dateTime(coupon.ends_at)} /><Detail label={t('coupon.fieldTimezone')} value={coupon.schedule_timezone || 'UTC'} /><Detail label={t('coupon.fieldPublic')} value={coupon.is_public === false ? t('coupon.private') : t('coupon.public')} /><Detail label={t('coupon.followersOnly')} value={coupon.followers_only ? t('promotions.yes') : t('promotions.no')} /><Detail label={t('coupon.firstOrderOnly')} value={coupon.first_order_only ? t('promotions.yes') : t('promotions.no')} />
      <Text style={styles.section}>{t('coupon.sectionTargets')}</Text>
      {coupon.scope === 'store' ? <Notice text={t('coupon.targetsAll')} /> : <TargetList rows={(coupon.scope === 'products' ? coupon.products : coupon.scope === 'categories' ? coupon.categories : coupon.variants) ?? []} empty={t('coupon.noTargets')} />}
      <Text style={styles.section}>{t('coupon.sectionPerformance')}</Text>
      <View style={styles.metrics}><Metric label={t('coupon.statUsed')} value={String(coupon.usages_count ?? coupon.usage_count ?? 0)} /><Metric label={t('coupon.statRedeemed')} value={String(coupon.redeemed_usages_count ?? 0)} /><Metric label={t('referral.fieldReserved')} value={String(coupon.reserved_count ?? 0)} /><Metric label={t('coupon.statRemaining')} value={coupon.usage_limit == null ? t('promotions.unlimited') : String(Math.max(0, coupon.usage_limit - (coupon.usage_count ?? 0) - (coupon.reserved_count ?? 0)))} /></View>
      <Text style={styles.section}>{t('coupon.sectionUsage')}</Text>
      {usages.length ? usages.map((usage) => <CouponUsageRow key={usage.id} usage={usage} />) : <Notice text={t('coupon.noUsage')} />}
      <Text style={styles.section}>{t('coupon.sectionAudit')}</Text>
      {coupon.audits?.length ? coupon.audits.map((audit, index) => <AuditRow key={String(audit.id ?? index)} action={audit.action} actor={audit.actor?.name} date={audit.created_at} />) : <Notice text={t('coupon.noAudit')} />}
    </> : null}</View>
  </Screen>;
}

export function CouponEditorScreen() {
  const { t } = useLanguage();
  const { id, session } = useLocalSearchParams<{ id?: string; session?: string }>(); const couponId = Number(id);
  const editing = Number.isFinite(couponId) && couponId > 0;
  const [draft, setDraft] = useState<CouponDraft>(freshCoupon); const [step, setStep] = useState(1); const [targets, setTargets] = useState<CouponTarget[]>([]); const [loading, setLoading] = useState(editing); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const reset = setTimeout(() => {
      setStep(1); setTargets([]); setError(null);
      if (!editing) { setDraft(freshCoupon()); setLoading(false); return; }
      setLoading(true);
      void sellerToolsService.coupon(couponId).then((row) => { if (live) setDraft(couponDraftFrom(row)); }).catch((cause) => { if (live) setError(getErrorMessage(cause)); }).finally(() => { if (live) setLoading(false); });
    }, 0);
    return () => { live = false; clearTimeout(reset); };
  }, [couponId, editing, session]);
  useEffect(() => {
    if (draft.scope === 'store') {
      const clear = setTimeout(() => setTargets([]), 0);
      return () => clearTimeout(clear);
    }
    let live = true;
    void sellerToolsService.couponTargets(draft.scope).then((rows) => { if (live) setTargets(rows); }).catch((cause) => { if (live) setError(getErrorMessage(cause)); });
    return () => { live = false; };
  }, [draft.scope]);
  const update = <K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setScope = (scope: CouponScope) => setDraft((current) => ({ ...current, scope, targetIds: [] }));
  const valid = () => {
    if (step === 1 && !draft.code.trim()) return 'Coupon code is required.';
    if (step === 2 && draft.discountType !== 'free_shipping' && (!Number.isFinite(Number(draft.discountValue)) || Number(draft.discountValue) <= 0)) return 'Enter a valid discount value.';
    if (step === 2 && draft.discountType === 'percentage' && Number(draft.discountValue) > 100) return 'A percentage discount cannot exceed 100%.';
    if (step === 2 && draft.scope !== 'store' && !draft.targetIds.length) return 'Select at least one eligible target.';
    if (step === 3 && draft.launchMode === 'schedule' && localDate(draft.startsAt).getTime() <= Date.now()) return 'Choose a future local start date and time, or choose Run now.';
    if (step === 3 && draft.endsAt && localDate(draft.endsAt).getTime() <= localDate(draft.launchMode === 'schedule' ? draft.startsAt : localValue(new Date())).getTime()) return 'The end date and time must be after the coupon starts.';
    return null;
  };
  const save = async () => {
    const reason = valid(); if (reason) { setError(reason); return; }
    try {
      setSaving(true); setError(null);
      const payload: Record<string, unknown> = {
        code: draft.code.trim().toUpperCase(), description: draft.description.trim() || null, discount_type: draft.discountType, discount_value: draft.discountType === 'free_shipping' ? 0 : Number(draft.discountValue),
        min_order_amount: nullableNumber(draft.minimumOrder), usage_limit: nullableNumber(draft.usageLimit), usage_per_user: nullableNumber(draft.usagePerUser),
        scope: draft.scope, is_public: draft.isPublic, followers_only: draft.followersOnly, first_order_only: draft.firstOrderOnly, is_active: draft.isActive,
        starts_at: draft.launchMode === 'schedule' ? iso(draft.startsAt) : undefined, ends_at: draft.endsAt ? iso(draft.endsAt) : null, schedule_timezone: localTimezone(),
      };
      if (!editing) payload.launch_mode = draft.launchMode;
      if (draft.scope === 'products') payload.product_ids = draft.targetIds;
      if (draft.scope === 'categories') payload.category_ids = draft.targetIds;
      if (draft.scope === 'variants') payload.variant_ids = draft.targetIds;
      if (editing) await sellerToolsService.updateCoupon(couponId, payload); else await sellerToolsService.createCoupon(payload);
      router.replace('/coupons');
    } catch (cause) { setError(getErrorMessage(cause)); } finally { setSaving(false); }
  };
  const continueFlow = () => { const reason = valid(); if (reason) setError(reason); else { setError(null); setStep((current) => Math.min(4, current + 1)); } };
  const titles = [t('coupon.reviewCode'), t('referral.stepRules'), t('referral.stepSchedule'), t('referral.stepReview')];
  return <Screen contentStyle={styles.bottom}>
    <AppHeader title={t(editing ? 'coupon.editTitle' : 'coupon.create')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => step > 1 ? setStep((current) => current - 1) : goBack('/coupons')} right={null} />
    <View style={styles.body}><StepBar active={step} titles={titles} /><Text style={styles.wizardHeading}>{titles[step - 1]}</Text><Text style={styles.copy}>{t(editing ? 'coupon.editHint' : 'coupon.newHint')}</Text>{error ? <Failure message={error} /> : null}
      {loading ? <Loading label={t('coupon.editorLoading')} /> : <>{step === 1 ? <CouponInformation draft={draft} update={update} /> : null}{step === 2 ? <CouponRules draft={draft} update={update} setScope={setScope} targets={targets} /> : null}{step === 3 ? <CouponSchedule draft={draft} update={update} editing={editing} /> : null}{step === 4 ? <CouponReview draft={draft} targets={targets} /> : null}<FlowActions step={step} saving={saving} onBack={() => step === 1 ? goBack('/coupons') : setStep((current) => current - 1)} onNext={continueFlow} onSave={() => void save()} /></>}
    </View>
  </Screen>;
}

function CouponInformation({ draft, update }: { draft: CouponDraft; update: <K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) => void }) {
  const { t } = useLanguage();
  return <><Field label={t('coupon.codeLabel')} value={draft.code} onChangeText={(value) => update('code', value.toUpperCase())} placeholder="WELCOME10" autoCapitalize="characters" /><Field label={t('coupon.descriptionLabel')} value={draft.description} onChangeText={(value) => update('description', value)} placeholder={t('coupon.descriptionPlaceholder')} multiline /></>;
}
function CouponRules({ draft, update, setScope, targets }: { draft: CouponDraft; update: <K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) => void; setScope: (scope: CouponScope) => void; targets: CouponTarget[] }) {
  const { t } = useLanguage();
  return <><Select label={t('coupon.discountType')} value={draft.discountType} values={['percentage', 'fixed_amount', 'free_shipping']} onChange={(value) => update('discountType', value as CouponDraft['discountType'])} />{draft.discountType !== 'free_shipping' ? <Field label={t(draft.discountType === 'percentage' ? 'coupon.discountPercentage' : 'coupon.discountAmount')} value={draft.discountValue} onChangeText={(value) => update('discountValue', value)} placeholder={draft.discountType === 'percentage' ? '10' : '5.00'} keyboardType="decimal-pad" /> : <Notice text={t('coupon.freeShippingHint')} />}<Field label={t('coupon.minSubtotal')} value={draft.minimumOrder} onChangeText={(value) => update('minimumOrder', value)} placeholder={t('coupon.optional')} keyboardType="decimal-pad" /><Select label={t('coupon.appliesTo')} value={draft.scope} values={['store', 'products', 'categories', 'variants']} onChange={(value) => setScope(value as CouponScope)} />{draft.scope !== 'store' ? <Selector label={t('coupon.selectEligiblePrefix') + readable(draft.scope)} rows={targets.map((row) => ({ id: row.id, name: targetName(row) }))} selected={draft.targetIds} onToggle={(id) => update('targetIds', toggleId(draft.targetIds, id))} empty={t('coupon.noEligiblePrefix') + readable(draft.scope).toLowerCase() + ' ' + t('coupon.areAvailableSuffix')} /> : <Notice text={t('coupon.appliesToAll')} />}<Field label={t('coupon.totalUsageLimit')} value={draft.usageLimit} onChangeText={(value) => update('usageLimit', value)} placeholder={t('coupon.unlimitedWhenEmpty')} keyboardType="number-pad" /><Field label={t('coupon.perBuyerLimit')} value={draft.usagePerUser} onChangeText={(value) => update('usagePerUser', value)} placeholder={t('coupon.unlimitedWhenEmpty')} keyboardType="number-pad" /></>;
}
function CouponSchedule({ draft, update, editing }: { draft: CouponDraft; update: <K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) => void; editing: boolean }) {
  const { t } = useLanguage();
  return <><Text style={styles.fieldLabel}>{t('coupon.reviewActivation')}</Text>{!editing ? <Select value={draft.launchMode} values={['run_now', 'schedule']} onChange={(value) => update('launchMode', value as CouponDraft['launchMode'])} /> : <Notice text={t('coupon.scheduleHint')} />}{draft.launchMode === 'schedule' ? <DateTimeField label={t('coupon.startsAt')} value={draft.startsAt} onChange={(value) => update('startsAt', value)} minimumDate={new Date()} /> : <Notice text={t('coupon.runNowHint')} />}<DateTimeField label={t('coupon.endsAtOptional')} value={draft.endsAt} onChange={(value) => update('endsAt', value)} minimumDate={new Date()} clearable /><Toggle label={t('coupon.isEnabled')} value={draft.isActive} onChange={(value) => update('isActive', value)} /><Toggle label={t('coupon.isPublic')} value={draft.isPublic} onChange={(value) => update('isPublic', value)} /><Toggle label={t('coupon.followersOnly')} value={draft.followersOnly} onChange={(value) => update('followersOnly', value)} /><Toggle label={t('coupon.firstOrderOnly')} value={draft.firstOrderOnly} onChange={(value) => update('firstOrderOnly', value)} /><Text style={styles.timeHint}>Times use {localTimezone()} and are converted safely before saving.</Text></>;
}
function CouponReview({ draft, targets }: { draft: CouponDraft; targets: CouponTarget[] }) {
  const { t } = useLanguage();
  return <View style={styles.review}><Detail label={t('coupon.reviewCode')} value={draft.code || '—'} /><Detail label={t('coupon.fieldDiscount')} value={draft.discountType === 'free_shipping' ? t('promotions.value.free_shipping') : draft.discountValue + (draft.discountType === 'percentage' ? '%' : ' €')} /><Detail label={t('coupon.fieldScope')} value={readable(draft.scope)} /><Detail label={t('coupon.reviewTargets')} value={draft.scope === 'store' ? t('coupon.entireStore') : String(draft.targetIds.length)} /><Detail label={t('coupon.reviewUsageLimits')} value={t('coupon.usageSummary', { total: draft.usageLimit || t('promotions.unlimited'), perBuyer: draft.usagePerUser || t('promotions.unlimited') })} /><Detail label={t('coupon.reviewActivation')} value={draft.launchMode === 'run_now' ? t('promotions.value.run_now') : dateTime(draft.startsAt)} /><Detail label={t('coupon.fieldEnds')} value={draft.endsAt ? dateTime(draft.endsAt) : t('coupon.noExpiry')} />{draft.scope !== 'store' && !targets.length ? <Notice danger text={t('coupon.reviewTargetsHint')} /> : null}</View>;
}

export function ReferralListScreen() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ReferralCampaign[]>([]); const [page, setPage] = useState(1); const [lastPage, setLastPage] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setError(null); const data = await sellerToolsService.referralsPage({ page, per_page: 25 }); setRows(data.data ?? []); setLastPage(data.last_page ?? 1); } catch (cause) { setError(getErrorMessage(cause)); } finally { setLoading(false); } }, [page]);
  useAutoRefresh(load, true, 15_000, String(page));
  const start = () => router.push({ pathname: '/referral-campaign-create', params: { session: String(Date.now()) } });
  return <Screen contentStyle={styles.bottom}>
    <AppHeader title={t('referral.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => goBack('/(tabs)')} right={<Pressable accessibilityLabel={t('referral.create')} style={styles.headerAdd} onPress={start}><MaterialCommunityIcons name="plus" size={22} color="#3E5877" /></Pressable>} />
    <View style={styles.body}><Text style={styles.overline}>{t('referral.overline')}</Text><Text style={styles.heading}>{t('referral.heading')}</Text><Text style={styles.copy}>{t('referral.copy')}</Text>{error ? <Failure message={error} /> : null}{loading ? <Loading label={t('referral.loading')} /> : rows.length ? <><View style={styles.list}>{rows.map((row) => <ReferralCard key={row.id} row={row} onPress={() => router.push({ pathname: '/referral-campaign/[id]', params: { id: String(row.id) } })} />)}</View>{lastPage > 1 ? <Pagination page={page} lastPage={lastPage} onChange={setPage} /> : null}</> : <Empty title={t('referral.emptyTitle')} copy={t('referral.emptyCopy')} action={t('referral.create')} onAction={start} />}</View>
  </Screen>;
}
function ReferralCard({ row, onPress }: { row: ReferralCampaign; onPress: () => void }) {
  const analytics = row.analytics || {};
  return <Pressable onPress={onPress} style={styles.card}><View style={styles.cardIcon}><MaterialCommunityIcons name="account-supervisor-outline" size={23} color={colors.blue} /></View><View style={styles.cardCopy}><View style={styles.rowTop}><Text numberOfLines={1} style={styles.cardTitle}>{row.name}</Text><Status value={row.status} /></View><Text style={styles.cardText}>{row.identifier} · {readable(row.scope_type)}</Text><Text style={styles.cardMeta}>{referralReward(row)} · {euro(row.budget_amount)} budget</Text><Text style={styles.cardMeta}>{analytics.clicks ?? 0} clicks · {analytics.orders ?? analytics.qualified_conversions ?? 0} orders · {euro(analytics.revenue_generated)} revenue</Text></View><MaterialCommunityIcons name="chevron-right" size={21} color="#8B9AAF" /></Pressable>;
}

export function ReferralDetailsScreen() {
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string }>(); const campaignId = Number(id);
  const [campaign, setCampaign] = useState<ReferralCampaign | null>(null); const [analytics, setAnalytics] = useState<Record<string, string | number>>({}); const [rewards, setRewards] = useState<ReferralReward[]>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!Number.isFinite(campaignId) || campaignId < 1) { setError(t('referral.invalidLink')); setLoading(false); return; }
    try { setError(null); const data = await sellerToolsService.referral(campaignId); setCampaign(data.campaign); setAnalytics(data.analytics ?? data.campaign.analytics ?? {}); setRewards(data.rewards?.data ?? []); } catch (cause) { setError(getErrorMessage(cause)); } finally { setLoading(false); }
  }, [campaignId, t]);
  useAutoRefresh(load, true, 15_000, String(campaignId));
  const action = async (name: 'pause' | 'resume' | 'archive') => { try { setBusy(true); setError(null); await sellerToolsService.referralAction(campaignId, name); if (name === 'archive') { router.replace('/referral-campaigns'); return; } await load(); } catch (cause) { setError(getErrorMessage(cause)); } finally { setBusy(false); } };
  const archive = () => Alert.alert(t('referral.archiveTitle'), t('referral.archiveCopyStopped'), [{ text: t('promotions.cancel'), style: 'cancel' }, { text: t('promotions.archive'), style: 'destructive', onPress: () => void action('archive') }]);
  return <Screen contentStyle={styles.bottom}>
    <AppHeader title={t('referral.detailsTitle')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => goBack('/referral-campaigns')} right={null} />
    <View style={styles.body}>{loading ? <Loading label={t('referral.detailsLoading')} /> : error && !campaign ? <Failure message={error} /> : campaign ? <>
      <View style={styles.topActions}><ActionPill label={t('promotions.edit')} icon="pencil-outline" primary disabled={busy || ['archived', 'suspended'].includes(campaign.status)} onPress={() => router.push({ pathname: '/referral-campaign-create', params: { id: String(campaign.id) } })} />{campaign.status === 'paused' ? <ActionPill label={t('promotions.resume')} icon="play-circle-outline" disabled={busy} onPress={() => void action('resume')} /> : ['active', 'scheduled'].includes(campaign.status) ? <ActionPill label={t('promotions.pause')} icon="pause-circle-outline" disabled={busy} onPress={() => void action('pause')} /> : null}<ActionPill label={t('promotions.archive')} icon="archive-outline" destructive disabled={busy || campaign.status === 'archived'} onPress={archive} /></View>
      {error ? <Failure message={error} /> : null}
      <View style={styles.detailHero}><View style={styles.detailHeroIcon}><MaterialCommunityIcons name="account-supervisor-outline" size={30} color="#FFFFFF" /></View><View style={styles.detailHeroCopy}><Text style={styles.detailName}>{campaign.name}</Text><Text style={styles.detailSub}>{campaign.identifier} · {readable(campaign.scope_type)}</Text><Status value={campaign.status} /></View></View>
      <Text style={styles.section}>{t('referral.sectionRules')}</Text><Detail label={t('referral.fieldApproval')} value={readable(campaign.approval_status)} /><Detail label={t('coupon.fieldScope')} value={readable(campaign.scope_type)} /><Detail label={t('referral.fieldReward')} value={referralReward(campaign)} /><Detail label={t('referral.fieldMaxReward')} value={campaign.max_reward_per_order == null ? 'No cap' : euro(campaign.max_reward_per_order)} /><Detail label={t('coupon.fieldMinSubtotal')} value={euro(campaign.minimum_order_amount)} /><Detail label={t('referral.fieldMinQuantity')} value={String(campaign.minimum_quantity ?? 1)} /><Detail label={t('referral.fieldNewCustomersOnly')} value={campaign.new_customer_only ? 'Yes' : 'No'} /><Detail label={t('referral.fieldStacking')} value={readable(campaign.platform_stacking)} /><Detail label={t('referral.fieldUsageLimit')} value={campaign.usage_limit == null ? 'Unlimited' : String(campaign.usage_limit)} /><Detail label={t('referral.monthlyRewardLimit')} value={campaign.monthly_reward_limit == null ? 'Unlimited' : String(campaign.monthly_reward_limit)} /><Detail label={t('coupon.fieldPerBuyerLimit')} value={campaign.per_buyer_limit == null ? 'Unlimited' : String(campaign.per_buyer_limit)} />
      <Text style={styles.section}>{t('referral.sectionBudget')}</Text><Detail label={t('referral.fieldBudget')} value={euro(campaign.budget_amount)} /><Detail label={t('referral.fieldReserved')} value={euro(campaign.budget_reserved)} /><Detail label={t('referral.fieldSpent')} value={euro(campaign.budget_spent)} /><Detail label={t('coupon.reviewActivation')} value={readable(campaign.activation_mode)} /><Detail label={t('coupon.fieldStarts')} value={dateTime(campaign.starts_at)} /><Detail label={t('coupon.fieldEnds')} value={dateTime(campaign.ends_at)} />
      <Text style={styles.section}>{t('coupon.sectionTargets')}</Text>{campaign.scope_type === 'store' ? <Notice text={t('referral.targetsAll')} /> : <><TargetList rows={campaign.products ?? []} empty={t('referral.noProducts')} /><TargetList rows={campaign.categories ?? []} empty={t('referral.noCategories')} /></>}
      <Text style={styles.section}>{t('coupon.sectionPerformance')}</Text><View style={styles.metrics}>{Object.entries(analytics).map(([key, value]) => <Metric key={key} label={readable(key)} value={/revenue|cost|budget|value/.test(key) ? euro(value) : String(value ?? 0)} />)}</View>
      <Text style={styles.section}>{t('referral.sectionRewards')}</Text>{rewards.length ? rewards.map((reward) => <ReferralRewardRow key={reward.id} reward={reward} />) : <Notice text={t('referral.noRewards')} />}
    </> : null}</View>
  </Screen>;
}

export function ReferralEditorScreen() {
  const { t } = useLanguage();
  const { id, session } = useLocalSearchParams<{ id?: string; session?: string }>(); const campaignId = Number(id); const editing = Number.isFinite(campaignId) && campaignId > 0;
  const [draft, setDraft] = useState<ReferralDraft>(freshReferral); const [step, setStep] = useState(1); const [products, setProducts] = useState<{ id: number; name: string }[]>([]); const [categories, setCategories] = useState<{ id: number; name: string }[]>([]); const [loading, setLoading] = useState(editing); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let live = true; const reset = setTimeout(() => { setStep(1); setError(null); if (!editing) { setDraft(freshReferral()); setLoading(false); return; } setLoading(true); void sellerToolsService.referral(campaignId).then((result) => { if (live) setDraft(referralDraftFrom(result.campaign)); }).catch((cause) => { if (live) setError(getErrorMessage(cause)); }).finally(() => { if (live) setLoading(false); }); }, 0); return () => { live = false; clearTimeout(reset); }; }, [campaignId, editing, session]);
  useEffect(() => { let live = true; void sellerToolsService.campaignOptions().then((result) => { if (!live) return; setProducts(result.products ?? []); setCategories(result.categories ?? []); }).catch((cause) => { if (live) setError(getErrorMessage(cause)); }); return () => { live = false; }; }, []);
  const update = <K extends keyof ReferralDraft>(key: K, value: ReferralDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const valid = () => {
    if (step === 1 && !draft.name.trim()) return 'Campaign name is required.';
    if (step === 2 && (!Number.isFinite(Number(draft.rewardAmount)) || Number(draft.rewardAmount) <= 0)) return 'Enter a valid reward amount.';
    if (step === 2 && draft.rewardType === 'percentage' && Number(draft.rewardAmount) > 100) return 'A percentage reward cannot exceed 100%.';
    if (step === 2 && (!Number.isFinite(Number(draft.budget)) || Number(draft.budget) <= 0)) return 'Enter a positive campaign budget.';
    if (step === 2 && ['products', 'mixed'].includes(draft.scope) && !draft.productIds.length && draft.scope !== 'mixed') return 'Select at least one eligible product.';
    if (step === 2 && ['categories', 'mixed'].includes(draft.scope) && !draft.categoryIds.length && draft.scope !== 'mixed') return 'Select at least one eligible category.';
    if (step === 2 && draft.scope === 'mixed' && !draft.productIds.length && !draft.categoryIds.length) return 'Select at least one eligible product or category.';
    if (step === 3 && draft.activation === 'scheduled' && localDate(draft.startsAt).getTime() <= Date.now()) return 'Choose a future local activation time, or select Run now.';
    if (step === 3 && draft.endsAt && localDate(draft.endsAt).getTime() <= localDate(draft.activation === 'scheduled' ? draft.startsAt : localValue(new Date())).getTime()) return 'The campaign end time must be after its activation time.';
    return null;
  };
  const save = async () => {
    const reason = valid(); if (reason) { setError(reason); return; }
    try {
      setSaving(true); setError(null);
      const payload: Record<string, unknown> = { name: draft.name.trim(), scope_type: draft.scope, reward_type: draft.rewardType, reward_amount: Number(draft.rewardAmount), max_reward_per_order: nullableNumber(draft.maxReward), budget_amount: Number(draft.budget), minimum_order_amount: nullableNumber(draft.minimumOrder) ?? 0, minimum_quantity: nullableNumber(draft.minimumQuantity) ?? 1, usage_limit: nullableNumber(draft.usageLimit), monthly_reward_limit: nullableNumber(draft.monthlyLimit), per_buyer_limit: nullableNumber(draft.perBuyerLimit), new_customer_only: draft.newCustomersOnly, platform_stacking: draft.stacking, activation_mode: draft.activation, starts_at: draft.activation === 'scheduled' ? iso(draft.startsAt) : undefined, ends_at: draft.endsAt ? iso(draft.endsAt) : null };
      if (draft.scope === 'products' || draft.scope === 'mixed') payload.product_ids = draft.productIds;
      if (draft.scope === 'categories' || draft.scope === 'mixed') payload.category_ids = draft.categoryIds;
      if (editing) await sellerToolsService.updateReferral(campaignId, payload); else await sellerToolsService.createReferral(payload);
      router.replace('/referral-campaigns');
    } catch (cause) { setError(getErrorMessage(cause)); } finally { setSaving(false); }
  };
  const continueFlow = () => { const reason = valid(); if (reason) setError(reason); else { setError(null); setStep((current) => Math.min(4, current + 1)); } };
  return <Screen contentStyle={styles.bottom}>
    <AppHeader title={t(editing ? 'referral.editTitle' : 'referral.createTitle')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => step > 1 ? setStep((current) => current - 1) : goBack('/referral-campaigns')} right={null} />
    <View style={styles.body}><StepBar active={step} titles={[t('referral.stepInfo'), t('referral.stepRules'), t('referral.stepSchedule'), t('referral.stepReview')]} /><Text style={styles.wizardHeading}>{[t('referral.stepInfo'), t('referral.stepRules'), t('referral.stepSchedule'), t('referral.stepReview')][step - 1]}</Text><Text style={styles.copy}>{t(editing ? 'referral.editHint' : 'referral.newHint')}</Text>{error ? <Failure message={error} /> : null}
      {loading ? <Loading label={t('referral.detailsLoading')} /> : <>{step === 1 ? <ReferralInformation draft={draft} update={update} /> : null}{step === 2 ? <ReferralRules draft={draft} update={update} products={products} categories={categories} /> : null}{step === 3 ? <ReferralSchedule draft={draft} update={update} /> : null}{step === 4 ? <ReferralReview draft={draft} /> : null}<FlowActions step={step} saving={saving} onBack={() => step === 1 ? goBack('/referral-campaigns') : setStep((current) => current - 1)} onNext={continueFlow} onSave={() => void save()} /></>}
    </View>
  </Screen>;
}
function ReferralInformation({ draft, update }: { draft: ReferralDraft; update: <K extends keyof ReferralDraft>(key: K, value: ReferralDraft[K]) => void }) {
  const { t } = useLanguage();
  return <><Field label={t('referral.nameLabel')} value={draft.name} onChangeText={(value) => update('name', value)} placeholder={t('referral.namePlaceholder')} /><Select label={t('referral.eligibleScope')} value={draft.scope} values={['store', 'products', 'categories', 'mixed']} onChange={(value) => update('scope', value as ReferralDraft['scope'])} /><Notice text={t('referral.scopeHint')} /></>; }
function ReferralRules({ draft, update, products, categories }: { draft: ReferralDraft; update: <K extends keyof ReferralDraft>(key: K, value: ReferralDraft[K]) => void; products: { id: number; name: string }[]; categories: { id: number; name: string }[] }) {
  const { t } = useLanguage();
  const needsProducts = draft.scope === 'products' || draft.scope === 'mixed'; const needsCategories = draft.scope === 'categories' || draft.scope === 'mixed';
  return <><Select label={t('referral.rewardType')} value={draft.rewardType} values={['fixed', 'percentage']} onChange={(value) => update('rewardType', value as ReferralDraft['rewardType'])} /><Field label={t(draft.rewardType === 'percentage' ? 'referral.rewardPercentage' : 'referral.rewardAmount')} value={draft.rewardAmount} onChangeText={(value) => update('rewardAmount', value)} keyboardType="decimal-pad" placeholder={draft.rewardType === 'percentage' ? '10' : '5.00'} /><Field label={t('referral.maxReward')} value={draft.maxReward} onChangeText={(value) => update('maxReward', value)} keyboardType="decimal-pad" placeholder={t('referral.optionalCap')} /><Field label={t('referral.campaignBudget')} value={draft.budget} onChangeText={(value) => update('budget', value)} keyboardType="decimal-pad" placeholder="50.00" /><Field label={t('coupon.minSubtotal')} value={draft.minimumOrder} onChangeText={(value) => update('minimumOrder', value)} keyboardType="decimal-pad" placeholder={t('coupon.optional')} /><Field label={t('referral.minItemQuantity')} value={draft.minimumQuantity} onChangeText={(value) => update('minimumQuantity', value)} keyboardType="number-pad" />{needsProducts ? <Selector label={t('referral.eligibleProducts')} rows={products} selected={draft.productIds} onToggle={(id) => update('productIds', toggleId(draft.productIds, id))} empty={t('referral.noProductsAvailable')} /> : null}{needsCategories ? <Selector label={t('referral.eligibleCategories')} rows={categories} selected={draft.categoryIds} onToggle={(id) => update('categoryIds', toggleId(draft.categoryIds, id))} empty={t('referral.noCategoriesAvailable')} /> : null}<Field label={t('referral.totalRewardLimit')} value={draft.usageLimit} onChangeText={(value) => update('usageLimit', value)} keyboardType="number-pad" placeholder={t('coupon.unlimitedWhenEmpty')} /><Field label={t('referral.monthlyRewardLimit')} value={draft.monthlyLimit} onChangeText={(value) => update('monthlyLimit', value)} keyboardType="number-pad" placeholder={t('coupon.unlimitedWhenEmpty')} /><Field label={t('referral.rewardLimitPerBuyer')} value={draft.perBuyerLimit} onChangeText={(value) => update('perBuyerLimit', value)} keyboardType="number-pad" placeholder={t('coupon.unlimitedWhenEmpty')} /><Toggle label={t('referral.fieldNewCustomersOnly')} value={draft.newCustomersOnly} onChange={(value) => update('newCustomersOnly', value)} /><Select label={t('referral.fieldStacking')} value={draft.stacking} values={['exclusive', 'allow_platform']} onChange={(value) => update('stacking', value as ReferralDraft['stacking'])} /></>;
}
function ReferralSchedule({ draft, update }: { draft: ReferralDraft; update: <K extends keyof ReferralDraft>(key: K, value: ReferralDraft[K]) => void }) {
  const { t } = useLanguage();
  return <><Select label={t('coupon.reviewActivation')} value={draft.activation} values={['immediate', 'scheduled']} names={[t('promotions.value.run_now'), t('referral.scheduleForLater')]} onChange={(value) => update('activation', value as ReferralDraft['activation'])} />{draft.activation === 'scheduled' ? <DateTimeField label={t('coupon.startsAt')} value={draft.startsAt} onChange={(value) => update('startsAt', value)} minimumDate={new Date()} /> : <Notice text={t('referral.runNowHint')} />}<DateTimeField label={t('coupon.endsAtOptional')} value={draft.endsAt} onChange={(value) => update('endsAt', value)} minimumDate={new Date()} clearable /><Text style={styles.timeHint}>{t('referral.timezoneHint')}</Text></>; }
function ReferralReview({ draft }: { draft: ReferralDraft }) {
  const { t } = useLanguage();
  return <View style={styles.review}><Detail label={t('referral.reviewCampaign')} value={draft.name || '—'} /><Detail label={t('coupon.fieldScope')} value={readable(draft.scope)} /><Detail label={t('referral.fieldReward')} value={draft.rewardAmount + (draft.rewardType === 'percentage' ? '%' : ' €')} /><Detail label={t('referral.fieldBudget')} value={euro(draft.budget)} /><Detail label={t('referral.reviewTargets')} value={String(draft.productIds.length + draft.categoryIds.length)} /><Detail label={t('coupon.reviewActivation')} value={draft.activation === 'immediate' ? t('promotions.value.run_now') : dateTime(draft.startsAt)} /><Detail label={t('coupon.fieldEnds')} value={draft.endsAt ? dateTime(draft.endsAt) : t('coupon.noExpiry')} /></View>; }

function couponDiscount(coupon: SellerCoupon) {
  const t = translate;
  return coupon.discount_type === 'free_shipping' ? t('promotions.value.free_shipping') : coupon.discount_type === 'percentage' ? t('promotions.discountPercentOff', { value: coupon.discount_value }) : t('promotions.discountFixedOff', { value: euro(coupon.discount_value) }); }
function referralReward(campaign: ReferralCampaign) { return campaign.reward_type === 'percentage' ? t2('referral.rewardPercent', { value: campaign.reward_amount }) : t2('referral.rewardAmountLabel', { value: euro(campaign.reward_amount) }); }
const t2 = translate;
function targetName(target: { name?: string; product?: { name?: string } | null; color_name?: string | null }) { return target.name || ((target.product?.name || translate('promotions.productFallback')) + (target.color_name ? ' · ' + target.color_name : '')); }
function TargetList({ rows, empty }: { rows: { id: number; name?: string; product?: { name: string } | null; color_name?: string | null }[]; empty: string }) { return rows.length ? <View style={styles.targetList}>{rows.map((row) => <Text key={row.id} style={styles.targetText}>• {targetName(row)}</Text>)}</View> : <Notice text={empty} />; }
function CouponUsageRow({ usage }: { usage: CouponUsage }) {
  const { t } = useLanguage();
  const order = usage.order?.order_no || usage.store_order?.order?.order_no || translate('promotions.orderUnavailable'); return <View style={styles.historyRow}><View><Text style={styles.historyTitle}>{order}</Text><Text style={styles.historyText}>{readable(usage.status)} · {dateTime(usage.created_at)}</Text></View><View><Text style={styles.historyValue}>{euro(usage.discount_amount)}</Text><Text style={styles.historyText}>{usage.shipping_discount ? t('promotions.shippingSuffix', { amount: euro(usage.shipping_discount) }) : t('promotions.noShippingDiscount')}</Text></View></View>; ;
}
function ReferralRewardRow({ reward }: { reward: ReferralReward }) { return <View style={styles.historyRow}><View><Text style={styles.historyTitle}>{reward.order?.order_no || translate('promotions.orderUnavailable')}</Text><Text style={styles.historyText}>{readable(reward.status)} · {dateTime(reward.created_at)}</Text></View><Text style={styles.historyValue}>{euro(reward.amount)}</Text></View>; }
function AuditRow({ action, actor, date }: { action?: string | null; actor?: string | null; date?: string | null }) { return <View style={styles.audit}><View style={styles.auditDot} /><View><Text style={styles.historyTitle}>{readable(action)}</Text><Text style={styles.historyText}>{actor ? 'By ' + actor + ' · ' : ''}{dateTime(date)}</Text></View></View>; }
function FlowActions({ step, saving, onBack, onNext, onSave }: { step: number; saving: boolean; onBack: () => void; onNext: () => void; onSave: () => void }) {
  const { t } = useLanguage();
  return <View style={styles.flowActions}><AppButton label={t(step === 1 ? 'promotions.cancel' : 'promotions.back')} variant="secondary" onPress={onBack} style={styles.actionFlex} /><AppButton label={step === 4 ? saving ? t('promotions.saving') : t('promotions.save') : t('promotions.continue')} disabled={saving} onPress={step === 4 ? onSave : onNext} style={styles.actionFlex} /></View>; }
function DateTimeField({ label, value, onChange, minimumDate, clearable }: { label: string; value: string; onChange: (value: string) => void; minimumDate?: Date; clearable?: boolean }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<PickerMode>(null); const current = localDate(value);
  const pick = (event: DateTimePickerEvent, date?: Date) => { if (Platform.OS === 'android') setMode(null); if (event.type === 'dismissed' || !date) return; const next = localDate(value); if (mode === 'date') next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); else next.setHours(date.getHours(), date.getMinutes(), 0, 0); onChange(localValue(next)); };
  return <View style={styles.fieldGroup}><View style={styles.dateLabelRow}><Text style={styles.fieldLabel}>{label}</Text>{clearable && value ? <Pressable onPress={() => onChange('')}><Text style={styles.clear}>{t('promotions.clear')}</Text></Pressable> : null}</View><View style={styles.dateTimeRow}><Pressable style={styles.dateTimeButton} onPress={() => setMode('date')}><MaterialCommunityIcons name="calendar-outline" size={17} color={colors.blue} /><Text style={styles.dateTimeText}>{value ? new Intl.DateTimeFormat(localeTag(getActiveLanguage()), { dateStyle: 'medium' }).format(current) : t('promotions.noEndDate')}</Text></Pressable><Pressable style={styles.dateTimeButton} onPress={() => setMode('time')} disabled={!value && clearable}><MaterialCommunityIcons name="clock-outline" size={17} color={colors.blue} /><Text style={styles.dateTimeText}>{value ? new Intl.DateTimeFormat(localeTag(getActiveLanguage()), { timeStyle: 'short' }).format(current) : '—'}</Text></Pressable></View>{mode ? <DateTimePicker value={current} mode={mode} minimumDate={minimumDate} onChange={pick} /> : null}</View>;
}
function Field({ label, multiline, ...props }: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) { return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} multiline={multiline} placeholderTextColor="#7C8BA0" style={[styles.field, multiline && styles.textarea]} /></View>; }
function Select({ label, value, values, names, onChange }: { label?: string; value: string; values: string[]; names?: string[]; onChange: (value: string) => void }) { return <View style={label ? styles.fieldGroup : undefined}>{label ? <Text style={styles.fieldLabel}>{label}</Text> : null}<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceScroll}>{values.map((item, index) => <Choice key={item} label={names?.[index] || readable(item)} active={value === item} onPress={() => onChange(item)} />)}</ScrollView></View>; }
function FilterRail({ current, values, allLabel, onChange }: { current: string; values: string[]; allLabel: string; onChange: (value: string) => void }) { return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>{values.map((value) => <Choice key={value || 'all'} label={value ? readable(value) : allLabel} active={current === value} onPress={() => onChange(value)} />)}</ScrollView>; }
function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }
function Selector({ label, rows, selected, onToggle, empty }: { label: string; rows: { id: number; name: string }[]; selected: number[]; onToggle: (id: number) => void; empty: string }) { return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{label}</Text>{rows.length ? <View style={styles.selector}>{rows.map((row) => <Pressable key={row.id} onPress={() => onToggle(row.id)} style={styles.selectorRow}><MaterialCommunityIcons name={selected.includes(row.id) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={21} color={colors.blue} /><Text style={styles.selectorText}>{row.name}</Text></Pressable>)}</View> : <Notice text={empty} />}</View>; }
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.toggle}><Text style={styles.toggleText}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: '#CBD5E1', true: '#8AC0FF' }} thumbColor={value ? colors.blue : '#FFFFFF'} /></View>; }
function StepBar({ active, titles }: { active: number; titles: string[] }) { return <View style={styles.stepBar}>{titles.map((title, index) => <View key={title} style={styles.stepWrap}><View style={[styles.stepDot, index + 1 <= active && styles.stepDotActive]}><Text style={[styles.stepNumber, index + 1 <= active && styles.stepNumberActive]}>{index + 1}</Text></View><Text numberOfLines={1} style={[styles.stepText, index + 1 === active && styles.stepTextActive]}>{title}</Text></View>)}</View>; }
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text selectable style={styles.detailValue}>{value}</Text></View>; }
function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function Status({ value }: { value: string }) { return <View style={[styles.status, ['active', 'redeemed', 'approved'].includes(value) && styles.statusActive]}><Text style={[styles.statusText, ['active', 'redeemed', 'approved'].includes(value) && styles.statusTextActive]}>{readable(value)}</Text></View>; }
function ActionPill({ label, icon, onPress, disabled, primary, destructive }: { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; onPress: () => void; disabled: boolean; primary?: boolean; destructive?: boolean }) { return <Pressable onPress={onPress} disabled={disabled} style={[styles.actionPill, primary && styles.actionPillPrimary, destructive && styles.actionPillDanger, disabled && styles.disabled]}><MaterialCommunityIcons name={icon} size={16} color={primary ? '#FFFFFF' : destructive ? colors.red : colors.blue} /><Text style={[styles.actionPillText, primary && styles.actionPillPrimaryText, destructive && styles.actionPillDangerText]}>{label}</Text></Pressable>; }
function Pagination({ page, lastPage, onChange }: { page: number; lastPage: number; onChange: (page: number) => void }) {
  const { t } = useLanguage();
  return <View style={styles.pagination}><AppButton label={t('promotions.previous')} variant="secondary" disabled={page <= 1} onPress={() => onChange(Math.max(1, page - 1))} style={styles.actionFlex} /><Text style={styles.pageText}>Page {page} of {lastPage}</Text><AppButton label={t('promotions.next')} variant="secondary" disabled={page >= lastPage} onPress={() => onChange(Math.min(lastPage, page + 1))} style={styles.actionFlex} /></View>; }
function Notice({ text, danger }: { text: string; danger?: boolean }) { return <View style={[styles.notice, danger && styles.noticeDanger]}><MaterialCommunityIcons name={danger ? 'alert-circle-outline' : 'information-outline'} size={18} color={danger ? colors.red : colors.blue} /><Text style={[styles.noticeText, danger && styles.noticeDangerText]}>{text}</Text></View>; }
function Loading({ label }: { label: string }) { return <View style={styles.loading}><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.copy}>{label}</Text></View>; }
function Failure({ message }: { message: string }) { return <View style={styles.failure}><MaterialCommunityIcons name="alert-circle-outline" size={19} color={colors.red} /><Text style={styles.failureText}>{message}</Text></View>; }
function Empty({ title, copy, action, onAction }: { title: string; copy: string; action: string; onAction: () => void }) { return <View style={styles.empty}><MaterialCommunityIcons name="folder-open-outline" size={32} color={colors.blue} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.copy}>{copy}</Text><AppButton label={action} onPress={onAction} /></View>; }

const styles = StyleSheet.create({
  bottom: { paddingBottom: 128 }, body: { padding: 20 }, overline: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }, heading: { color: colors.ink, fontSize: 25, fontWeight: '800', letterSpacing: -1, marginTop: 4 }, copy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, headerAdd: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, ...shadow.card }, search: { minHeight: 48, marginTop: 15, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow.card }, searchInput: { flex: 1, paddingVertical: 11, color: colors.ink, fontSize: 13 }, filterRail: { gap: 7, paddingTop: 10 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 }, metric: { width: '31%', minHeight: 68, padding: 9, borderRadius: 12, backgroundColor: colors.surface, ...shadow.card }, metricValue: { color: colors.blue, fontSize: 14, fontWeight: '800' }, metricLabel: { color: colors.subtle, fontSize: 8, marginTop: 4 }, list: { gap: 10, marginTop: 14 }, card: { minHeight: 108, padding: 11, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow.card }, cardIcon: { height: 52, width: 52, borderRadius: 15, backgroundColor: '#E7F1FF', alignItems: 'center', justifyContent: 'center' }, cardCopy: { flex: 1, minWidth: 0 }, rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 }, cardTitle: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '800' }, cardText: { color: colors.muted, fontSize: 10, marginTop: 3 }, cardMeta: { color: '#718096', fontSize: 9, marginTop: 4 }, status: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: '#EEF2F6' }, statusActive: { backgroundColor: colors.greenSoft }, statusText: { color: '#526277', fontSize: 8, fontWeight: '800' }, statusTextActive: { color: colors.green }, topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 }, actionPill: { minHeight: 36, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#EAF3FF', flexDirection: 'row', gap: 6, alignItems: 'center' }, actionPillPrimary: { backgroundColor: colors.blue }, actionPillDanger: { backgroundColor: '#FFF0F1', borderWidth: 1, borderColor: '#FFD1D5' }, actionPillText: { color: colors.blue, fontWeight: '800', fontSize: 10 }, actionPillPrimaryText: { color: '#FFFFFF' }, actionPillDangerText: { color: colors.red }, disabled: { opacity: .55 }, detailHero: { minHeight: 106, padding: 13, borderRadius: radius.lg, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', gap: 11 }, detailHeroIcon: { height: 64, width: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }, detailHeroCopy: { flex: 1, minWidth: 0 }, detailName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' }, detailSub: { color: '#DCEBFF', fontSize: 11, marginTop: 4, marginBottom: 6 }, description: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 15 }, section: { color: '#718096', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 21, marginBottom: 8 }, detail: { minHeight: 44, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#E3EAF3', gap: 10 }, detailLabel: { color: colors.muted, fontSize: 11, flex: 1 }, detailValue: { maxWidth: '62%', color: colors.ink, fontSize: 11, textAlign: 'right', fontWeight: '800' }, targetList: { padding: 11, borderRadius: 12, backgroundColor: colors.surface, ...shadow.card }, targetText: { color: colors.ink, fontSize: 11, lineHeight: 19, fontWeight: '700' }, historyRow: { minHeight: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderColor: '#E3EAF3', gap: 8 }, historyTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' }, historyText: { color: colors.muted, fontSize: 9, marginTop: 3 }, historyValue: { color: colors.blue, fontSize: 12, fontWeight: '800', textAlign: 'right' }, audit: { minHeight: 48, flexDirection: 'row', gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderColor: '#E3EAF3' }, auditDot: { height: 8, width: 8, borderRadius: 4, marginTop: 4, backgroundColor: colors.blue }, wizardHeading: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -.7 }, stepBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }, stepWrap: { width: '24%', alignItems: 'center' }, stepDot: { height: 27, width: 27, borderRadius: 14, backgroundColor: '#E3EAF3', justifyContent: 'center', alignItems: 'center' }, stepDotActive: { backgroundColor: colors.blue }, stepNumber: { color: colors.muted, fontSize: 11, fontWeight: '800' }, stepNumberActive: { color: '#FFFFFF' }, stepText: { color: colors.subtle, fontSize: 8, marginTop: 4, textAlign: 'center' }, stepTextActive: { color: colors.blue, fontWeight: '800' }, fieldGroup: { marginTop: 14 }, fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 6 }, field: { minHeight: 48, paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.surface, color: colors.ink, fontSize: 13, ...shadow.card }, textarea: { minHeight: 98, paddingTop: 12, textAlignVertical: 'top' }, choiceScroll: { gap: 7, paddingVertical: 1, paddingRight: 12 }, choice: { minHeight: 35, paddingHorizontal: 11, borderRadius: 17, backgroundColor: '#EAF0F7', justifyContent: 'center' }, choiceActive: { backgroundColor: colors.blue }, choiceText: { color: colors.muted, fontSize: 10, fontWeight: '800' }, choiceTextActive: { color: '#FFFFFF' }, selector: { maxHeight: 230, borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden', ...shadow.card }, selectorRow: { minHeight: 43, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#E8EDF4' }, selectorText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700' }, toggle: { minHeight: 58, marginTop: 14, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow.card }, toggleText: { color: colors.ink, fontSize: 12, fontWeight: '800' }, dateLabelRow: { flexDirection: 'row', justifyContent: 'space-between' }, clear: { color: colors.red, fontSize: 11, fontWeight: '800' }, dateTimeRow: { flexDirection: 'row', gap: 8 }, dateTimeButton: { flex: 1, minHeight: 47, paddingHorizontal: 10, borderRadius: 11, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 7, ...shadow.card }, dateTimeText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '700' }, timeHint: { marginTop: 10, color: '#285B96', fontSize: 10, lineHeight: 15 }, review: { marginTop: 14, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card }, flowActions: { flexDirection: 'row', gap: 9, marginTop: 25 }, actionFlex: { flex: 1 }, notice: { marginTop: 14, padding: 11, borderRadius: 11, backgroundColor: '#EAF3FF', flexDirection: 'row', gap: 8 }, noticeDanger: { backgroundColor: '#FFF0F1' }, noticeText: { flex: 1, color: '#285B96', fontSize: 11, lineHeight: 16, fontWeight: '700' }, noticeDangerText: { color: colors.red }, loading: { minHeight: 210, alignItems: 'center', justifyContent: 'center', gap: 10 }, failure: { padding: 11, borderRadius: 11, backgroundColor: '#FFF0F1', flexDirection: 'row', gap: 8, marginTop: 12 }, failureText: { flex: 1, color: colors.red, fontSize: 11, lineHeight: 16, fontWeight: '700' }, empty: { minHeight: 200, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 8 }, emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'center' }, pagination: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }, pageText: { color: colors.muted, fontSize: 10, fontWeight: '800', textAlign: 'center' },
});
