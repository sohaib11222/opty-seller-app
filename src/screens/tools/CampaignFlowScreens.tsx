import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { AppButton } from '../../components/ui/AppButton';
import { AppHeader } from '../../components/ui/AppHeader';
import { Screen } from '../../components/ui/Screen';
import { appendImage } from '../../services/api/attachment';
import { getErrorMessage } from '../../services/api/client';
import { sellerToolsService, type CampaignAudit, type CampaignOptions, type CampaignUsage, type SellerCampaign } from '../../services/seller/tools.service';
import { freshCampaignDraft, type CampaignKind, type CampaignDraft, useCampaignDraft } from '../../features/campaigns/CampaignDraftContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { goBack } from '../../navigation/back';
import { colors, radius, shadow } from '../../theme/tokens';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { getActiveLanguage, translate } from '../../features/i18n/translate';
import { apiLabel } from '../../features/i18n/apiLabels';
import type { Language } from '../../features/i18n/dictionaries/core';

type PickerMode = 'date' | 'time' | null;
type CampaignReport = { metrics?: Record<string, number | string | null>; usage?: { data?: CampaignUsage[] } };

const finalStatuses = new Set(['expired', 'cancelled', 'completed']);
const statusFilters = ['', 'draft', 'scheduled', 'active', 'paused', 'expired', 'cancelled', 'completed'];
const placements = ['homepage_hero', 'homepage_featured', 'category_page', 'store_page', 'sidebar'];
const label = (value?: string | null) => apiLabel('campaign.value', value);
const localeTag = (language: Language) => (language === 'it' ? 'it-IT' : 'en-IE');
const number = (value: string) => value.trim() === '' ? null : Number(value);
const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const dateToLocalInput = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}T${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
const localInputDate = (value?: string | null) => {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};
const iso = (value: string) => localInputDate(value).toISOString();
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat(localeTag(getActiveLanguage()), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : translate('campaign.notScheduled');
const money = (value?: number | string | null) => new Intl.NumberFormat(localeTag(getActiveLanguage()), { style: 'currency', currency: 'EUR' }).format(Number(value || 0));

const kinds: Record<CampaignKind, { prefix: string }> = {
  banner: { prefix: 'campaign.banner' },
  discount: { prefix: 'campaign.discount' },
};

function campaignActions(campaign: SellerCampaign, kind: CampaignKind) {
  if (finalStatuses.has(campaign.status)) return ['duplicate', 'delete'];
  if (kind === 'banner') {
    if (campaign.status === 'draft') return ['submit', 'duplicate', 'delete'];
    if (campaign.status === 'paused') return [campaign.approval_status === 'approved' ? 'resume' : 'submit', 'duplicate', 'delete'];
    return ['pause', 'duplicate', 'delete'];
  }
  if (campaign.status === 'draft') return ['publish', 'duplicate', 'delete'];
  if (campaign.status === 'paused') return ['resume', 'duplicate', 'delete'];
  return ['pause', 'duplicate', 'delete'];
}

export function CampaignListScreen() {
  const { t, language } = useLanguage();
  const params = useLocalSearchParams<{ kind?: CampaignKind }>();
  const kind: CampaignKind = params.kind === 'banner' ? 'banner' : 'discount';
  const meta = { title: t(`${kinds[kind].prefix}.title`), overline: t(`${kinds[kind].prefix}.overline`), heading: t(`${kinds[kind].prefix}.heading`), copy: t(`${kinds[kind].prefix}.copy`), create: t(`${kinds[kind].prefix}.create`) };
  const { reset } = useCampaignDraft();
  const [rows, setRows] = useState<SellerCampaign[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [approval, setApproval] = useState('');
  const [placement, setPlacement] = useState('');
  const [scope, setScope] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const query = { search: search || undefined, status: status || undefined, per_page: 25, page };
      const response = kind === 'banner'
        ? await sellerToolsService.bannerCampaignsPage({ ...query, approval_status: approval || undefined, placement: placement || undefined })
        : await sellerToolsService.discountCampaignsPage({ ...query, scope: scope || undefined });
      setRows(response.data ?? []); setLastPage(response.last_page ?? 1);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [approval, kind, page, placement, scope, search, status]);

  useAutoRefresh(load, true, 15_000, `${kind}:${search}:${status}:${approval}:${placement}:${scope}:${page}`);
  const startNew = () => {
    reset(kind);
    router.push({ pathname: '/campaign-wizard/[kind]/step-1', params: { kind, session: String(Date.now()) } });
  };

  return <Screen contentStyle={styles.bottom}>
    <AppHeader title={meta.title} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => goBack('/(tabs)')} right={<Pressable accessibilityLabel={meta.create} onPress={startNew} style={styles.headerAdd}><MaterialCommunityIcons name="plus" size={22} color="#3E5877" /></Pressable>} />
    <View style={styles.body}>
      <Text style={styles.overline}>{meta.overline}</Text><Text style={styles.heading}>{meta.heading}</Text><Text style={styles.copy}>{meta.copy}</Text>
      <View style={styles.search}><MaterialCommunityIcons name="magnify" size={19} color="#718096" /><TextInput value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder={t('campaign.searchPlaceholder')} placeholderTextColor="#7C8BA0" style={styles.searchInput} /></View>
      <FilterRail values={statusFilters} current={status} allLabel={t('campaign.allStatuses')} onChange={(value) => { setStatus(value); setPage(1); }} />
      {kind === 'banner' ? <><FilterRail values={['', 'pending', 'approved', 'rejected']} current={approval} allLabel={t('campaign.allApprovals')} onChange={(value) => { setApproval(value); setPage(1); }} /><FilterRail values={['', ...placements]} current={placement} allLabel={t('campaign.allPlacements')} onChange={(value) => { setPlacement(value); setPage(1); }} /></> : <FilterRail values={['', 'products', 'variants', 'categories', 'store']} current={scope} allLabel={t('campaign.allScopes')} onChange={(value) => { setScope(value); setPage(1); }} />}
      {error ? <Failure message={error} /> : null}
      {loading ? <Loading label={t('campaign.loading')} /> : rows.length ? <><View style={styles.list}>{rows.map((row) => <CampaignListCard key={row.id} kind={kind} row={row} onPress={() => router.push({ pathname: '/campaign-details/[kind]/[id]', params: { kind, id: String(row.id) } })} />)}</View>{lastPage > 1 ? <View style={styles.pagination}><AppButton label={t('campaign.previous')} variant="secondary" disabled={page <= 1} onPress={() => setPage((value) => Math.max(1, value - 1))} style={styles.actionFlex} /><Text style={styles.pageText}>{t('campaign.pageOf', { page, total: lastPage })}</Text><AppButton label={t('campaign.next')} variant="secondary" disabled={page >= lastPage} onPress={() => setPage((value) => Math.min(lastPage, value + 1))} style={styles.actionFlex} /></View> : null}</> : <Empty title={t('campaign.emptyTitle')} copy={t('campaign.emptyCopy', { action: meta.create.toLocaleLowerCase(language) })} action={meta.create} onAction={startNew} />}
    </View>
  </Screen>;
}

function CampaignListCard({ kind, row, onPress }: { kind: CampaignKind; row: SellerCampaign; onPress: () => void }) {
  const { t } = useLanguage();
  const creative = row.creatives?.[0];
  const summary = kind === 'banner'
    ? `${label(row.placement)} · ${t('campaign.approvalPrefix', { status: label(row.approval_status) })}`
    : `${t(row.discount_type === 'percentage' ? 'campaign.discountPercent' : 'campaign.discountFixed', { value: row.discount_value ?? 0 })} · ${label(row.scope)}`;
  const performance = row.analytics?.orders ?? row.analytics?.impressions ?? row.analytics?.uses ?? 0;
  return <Pressable onPress={onPress} style={styles.campaignCard}>
    {kind === 'banner' && creative?.desktop_url ? <Image source={{ uri: creative.desktop_url }} style={styles.bannerImage} /> : <View style={styles.campaignIcon}><MaterialCommunityIcons name={kind === 'banner' ? 'image-multiple-outline' : 'sale-outline'} size={23} color={colors.blue} /></View>}
    <View style={styles.campaignCopy}>
      <View style={styles.rowTop}><Text numberOfLines={1} style={styles.cardTitle}>{row.name}</Text><Status value={row.status} /></View>
      <Text numberOfLines={1} style={styles.cardText}>{row.description || summary}</Text>
      <Text style={styles.cardMeta}>{summary}</Text><Text style={styles.cardMeta}>{dateTime(row.starts_at)} → {dateTime(row.ends_at)}</Text>
      <Text style={styles.analytics}>{t(kind === 'banner' ? 'campaign.impressionsOrders' : 'campaign.usesOrders', { count: performance })}</Text>
    </View><MaterialCommunityIcons name="chevron-right" size={21} color="#8B9AAF" />
  </Pressable>;
}

export function CampaignDetailsScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ kind?: CampaignKind; id?: string }>();
  const kind: CampaignKind = params.kind === 'banner' ? 'banner' : 'discount';
  const id = Number(params.id);
  const { replace } = useCampaignDraft();
  const [row, setRow] = useState<SellerCampaign | null>(null);
  const [report, setReport] = useState<CampaignReport | null>(null);
  const [audits, setAudits] = useState<CampaignAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRoute = kind === 'banner' ? '/banners?kind=banner' : '/promotions?kind=discount';

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setError('This campaign link is invalid.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [campaign, analytics, auditResponse] = await Promise.all([
        sellerToolsService.campaignDetail(kind, id),
        sellerToolsService.campaignAnalytics(kind, id).catch(() => null),
        sellerToolsService.campaignAudits(kind, id).catch(() => ({ data: [] })),
      ]);
      setRow(campaign); setReport(analytics); setAudits(auditResponse.data ?? []);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [id, kind]);
  useAutoRefresh(load, true, 15_000, `${kind}:${id}`);

  const action = async (name: string) => {
    if (!row) return;
    try {
      setBusy(true); setError(null);
      const changed = await sellerToolsService.campaignAction(kind, row.id, name);
      if (name === 'delete') { router.replace(listRoute); return; }
      if (name === 'duplicate') { router.replace({ pathname: '/campaign-details/[kind]/[id]', params: { kind, id: String(changed.id) } }); return; }
      await load();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  const openEditor = () => {
    if (!row || finalStatuses.has(row.status)) return;
    const continueEditing = (campaign: SellerCampaign) => {
      replace(kind, draftFromCampaign(campaign));
      router.push({ pathname: '/campaign-wizard/[kind]/step-1', params: { kind, id: String(campaign.id) } });
    };
    if (kind === 'discount' && row.status === 'active') {
      Alert.alert(t('campaign.pauseBeforeEdit'), t('campaign.pauseBeforeEditCopy'), [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pause and edit', onPress: () => void (async () => {
          try { setBusy(true); setError(null); const paused = await sellerToolsService.campaignAction(kind, row.id, 'pause'); const completeCampaign = await sellerToolsService.campaignDetail(kind, paused.id); continueEditing(completeCampaign); }
          catch (cause) { setError(getErrorMessage(cause)); }
          finally { setBusy(false); }
        })() },
      ]);
      return;
    }
    continueEditing(row);
  };
  const confirmAction = (name: string) => {
    if (name !== 'delete') { void action(name); return; }
    Alert.alert(t('campaign.deleteTitle'), t('campaign.deleteCopy'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: () => void action('delete') }]);
  };
  const metrics = useMemo(() => ({ ...(row?.analytics ?? {}), ...(report?.metrics ?? {}) }), [report?.metrics, row?.analytics]);

  return <Screen contentStyle={styles.bottom}>
    <AppHeader title={t('campaign.detailsTitle')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => goBack(listRoute)} right={null} />
    <View style={styles.body}>{loading ? <Loading label={t('campaign.detailsLoading')} /> : error && !row ? <Failure message={error} /> : row ? <>
      <View style={styles.topActions}>
        {!finalStatuses.has(row.status) ? <ActionPill label={t('campaign.edit')} icon="pencil-outline" primary onPress={openEditor} disabled={busy} /> : null}
        {campaignActions(row, kind).map((name) => <ActionPill key={name} label={t('campaign.action.' + name)} icon={actionIcon(name)} destructive={name === 'delete'} onPress={() => confirmAction(name)} disabled={busy} />)}
      </View>
      {error ? <Failure message={error} /> : null}
      <CampaignHero kind={kind} row={row} />
      {row.description ? <Text style={styles.description}>{row.description}</Text> : null}
      <Text style={styles.section}>{t('campaign.sectionStatus')}</Text>
      <Detail label={t('campaign.fieldStatus')} value={label(row.status)} /><Detail label={t('campaign.fieldStore')} value={row.store?.name || t('campaign.yourStore')} /><Detail label={t('campaign.fieldStarts')} value={dateTime(row.starts_at)} /><Detail label={t('campaign.fieldEnds')} value={dateTime(row.ends_at)} /><Detail label={t('campaign.fieldTimezone')} value={row.schedule_timezone || localTimezone()} />{row.created_at ? <Detail label={t('campaign.fieldCreated')} value={dateTime(row.created_at)} /> : null}{row.updated_at ? <Detail label={t('campaign.fieldUpdated')} value={dateTime(row.updated_at)} /> : null}
      {kind === 'banner' ? <BannerDetails row={row} /> : <DiscountDetails row={row} usage={report?.usage?.data ?? []} />}
      <Text style={styles.section}>{t('campaign.sectionAnalytics')}</Text>
      {Object.keys(metrics).length ? <View style={styles.metrics}>{Object.entries(metrics).map(([key, value]) => <Metric key={key} label={label(key)} value={formatMetric(key, value)} />)}</View> : <Notice text={t('campaign.analyticsHint')} />}
      <Text style={styles.section}>{t('campaign.sectionAudit')}</Text>
      {audits.length ? audits.map((audit, index) => <AuditRow key={`${audit.id ?? index}-${audit.created_at ?? ''}`} audit={audit} />) : <Notice text={t('campaign.noAudit')} />}
    </> : null}</View>
  </Screen>;
}

function CampaignHero({ kind, row }: { kind: CampaignKind; row: SellerCampaign }) {
  const creative = row.creatives?.[0];
  return <View style={styles.detailHero}>
    {kind === 'banner' && creative?.desktop_url ? <Image source={{ uri: creative.desktop_url }} style={styles.detailHeroImage} /> : <View style={styles.detailHeroIcon}><MaterialCommunityIcons name={kind === 'banner' ? 'image-multiple-outline' : 'sale-outline'} size={32} color="#FFFFFF" /></View>}
    <View style={styles.detailHeroCopy}><Text style={styles.detailName}>{row.name}</Text><Text style={styles.detailSub}>{kind === 'banner' ? `${label(row.placement)} · ${label(row.approval_status)}` : `${row.discount_value ?? 0}${row.discount_type === 'percentage' ? '%' : ' fixed'} off · ${label(row.scope)}`}</Text><Status value={row.status} /></View>
  </View>;
}

function BannerDetails({ row }: { row: SellerCampaign }) {
  const { t } = useLanguage();
  const creative = row.creatives?.[0];
  return <>
    <Text style={styles.section}>{t('campaign.sectionBannerConfig')}</Text>
    <Detail label={t('campaign.fieldCampaignType')} value={label(row.type)} /><Detail label={t('campaign.fieldApproval')} value={label(row.approval_status)} /><Detail label={t('campaign.fieldPlacement')} value={label(row.placement)} /><Detail label={t('campaign.fieldDestinationType')} value={label(row.destination_type)} /><Detail label={t('campaign.fieldDestination')} value={row.destination_url || (row.destination_id ? `#${row.destination_id}` : '—')} /><Detail label={t('campaign.fieldTargetCategory')} value={row.targeting?.category_id ? `#${row.targeting.category_id}` : '—'} /><Detail label={t('campaign.fieldPriority')} value={String(row.priority ?? 0)} /><Detail label={t('campaign.fieldRevision')} value={String(row.revision ?? 1)} />
    {row.rejection_reason ? <Notice danger text={t('campaign.reviewFeedback', { reason: row.rejection_reason })} /> : null}
    {row.review_reason ? <Notice danger text={t('campaign.reviewNote', { reason: row.review_reason })} /> : null}
    {creative ? <><Text style={styles.section}>{t('campaign.sectionCreative')}</Text>{creative.desktop_url ? <Image source={{ uri: creative.desktop_url }} style={styles.creativeImage} /> : null}{creative.mobile_url ? <Image source={{ uri: creative.mobile_url }} style={styles.creativeImage} /> : null}<Detail label={t('campaign.fieldTitle')} value={creative.title || '—'} /><Detail label={t('campaign.fieldDescription')} value={creative.description || '—'} /><Detail label={t('campaign.fieldAltText')} value={creative.alt_text || '—'} /><Detail label={t('campaign.fieldCta')} value={creative.cta_text || '—'} /><Detail label={t('campaign.fieldSortOrder')} value={String(creative.sort_order ?? 0)} /><Detail label={t('campaign.fieldCreativeActive')} value={t(creative.is_active === false ? 'campaign.no' : 'campaign.yes')} /></> : null}
  </>;
}

function DiscountDetails({ row, usage }: { row: SellerCampaign; usage: CampaignUsage[] }) {
  const { t } = useLanguage();
  return <>
    <Text style={styles.section}>{t('campaign.sectionDiscountRules')}</Text>
    <Detail label={t('campaign.fieldDiscount')} value={t(row.discount_type === 'percentage' ? 'campaign.discountPercent' : 'campaign.discountFixed', { value: row.discount_value ?? 0 })} /><Detail label={t('campaign.fieldScope')} value={label(row.scope)} /><Detail label={t('campaign.fieldMinOrder')} value={money(row.minimum_order_amount)} /><Detail label={t('campaign.fieldMinQuantity')} value={String(row.minimum_quantity ?? 1)} /><Detail label={t('campaign.fieldUsageLimit')} value={row.usage_limit == null ? t('campaign.unlimited') : String(row.usage_limit)} /><Detail label={t('campaign.fieldUsageCount')} value={String(row.usage_count ?? 0)} /><Detail label={t('campaign.fieldPerBuyerLimit')} value={row.per_buyer_limit == null ? t('campaign.unlimited') : String(row.per_buyer_limit)} /><Detail label={t('campaign.fieldPriority')} value={String(row.priority ?? 0)} /><Detail label={t('campaign.fieldStacking')} value={t(row.stacking ? 'campaign.allowed' : 'campaign.notAllowed')} />
    <Text style={styles.section}>{t('campaign.sectionEligibility')}</Text>
    {row.scope === 'store' ? <Notice text={t('campaign.eligibilityAll')} /> : null}
    {row.products?.length ? <TargetList title={t('campaign.fieldProducts')} rows={row.products.map((item) => item.name)} /> : null}
    {row.categories?.length ? <TargetList title={t('campaign.fieldCategories')} rows={row.categories.map((item) => item.name)} /> : null}
    {row.variants?.length ? <TargetList title={t('campaign.fieldVariants')} rows={row.variants.map((item) => `${label(item.variant_type)} #${item.variant_id}`)} /> : null}
    {!row.products?.length && !row.categories?.length && !row.variants?.length && row.scope !== 'store' ? <Notice text={t('campaign.noTargets')} danger /> : null}
    <Text style={styles.section}>{t('campaign.sectionUsage')}</Text>
    {usage.length ? usage.map((item) => <View style={styles.usage} key={item.id}><View><Text style={styles.usageTitle}>Order #{item.order_id ?? '—'}</Text><Text style={styles.usageText}>{t('campaign.unitsCount', { count: item.units ?? 0 })} · {dateTime(item.created_at)}</Text></View><View><Text style={styles.usageValue}>{money(item.discount_amount)}</Text><Text style={styles.usageText}>{t('campaign.revenueLabel', { amount: money(item.revenue) })}</Text></View></View>) : <Notice text={t('campaign.noUsage')} />}
  </>;
}

export function CampaignWizardStepScreen({ step }: { step: number }) {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ kind?: CampaignKind; id?: string; session?: string }>();
  const kind: CampaignKind = params.kind === 'banner' ? 'banner' : 'discount';
  const { drafts, patch, replace, reset } = useCampaignDraft();
  const draft = drafts[kind];
  const [options, setOptions] = useState<CampaignOptions | null>(null);
  const [loading, setLoading] = useState(step === 2);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<{ name: string; original_price: number | string; discounted_price: number | string; campaign_name?: string | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const campaignId = Number(params.id);

  useEffect(() => {
    if (step !== 2) return;
    let live = true;
    void sellerToolsService.campaignOptions().then((response) => { if (live) setOptions(response); }).catch((cause) => { if (live) setError(getErrorMessage(cause)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [step]);
  useEffect(() => {
    if (step !== 1 || !Number.isFinite(campaignId) || draft.id === campaignId) return;
    let live = true;
    void sellerToolsService.campaignDetail(kind, campaignId).then((campaign) => { if (live) replace(kind, draftFromCampaign(campaign)); }).catch((cause) => { if (live) setError(getErrorMessage(cause)); });
    return () => { live = false; };
  }, [campaignId, draft.id, kind, replace, step]);

  const next = () => {
    setError(null);
    if (step === 1 && !draft.name.trim()) return setError('Campaign name is required.');
    if (step === 2 && kind === 'banner' && !draft.id && !draft.desktop_image) return setError('Choose the required desktop banner image.');
    if (step === 2 && kind === 'discount' && ((draft.scope === 'products' && !draft.product_ids.length) || (draft.scope === 'categories' && !draft.category_ids.length) || (draft.scope === 'variants' && !draft.variants.length))) return setError(`Select at least one eligible ${draft.scope === 'products' ? 'product' : draft.scope === 'categories' ? 'category' : 'variant'}.`);
    if (step === 3 && !validSchedule(draft, kind)) return setError(scheduleError(draft, kind));
    router.push({ pathname: `/campaign-wizard/[kind]/step-${step + 1}` as never, params: { kind, ...(draft.id ? { id: String(draft.id) } : {}) } });
  };
  const exit = () => {
    if (!draft.id) reset(kind);
    goBack(kind === 'banner' ? '/banners?kind=banner' : '/promotions?kind=discount');
  };
  const save = async () => {
    if (!validSchedule(draft, kind)) { setError(scheduleError(draft, kind)); return; }
    try {
      setSaving(true); setError(null);
      if (kind === 'banner') {
        const body = new FormData();
        Object.entries(bannerPayload(draft)).forEach(([key, value]) => { if (key !== 'targeting' && value !== null && value !== '') body.append(key, String(value)); });
        if (draft.category_id) body.append('targeting[category_id]', draft.category_id);
        if (draft.desktop_image) appendImage(body, { ...draft.desktop_image, name: draft.desktop_image.name || 'banner-desktop.jpg' }, 'desktop_image');
        if (draft.mobile_image) appendImage(body, { ...draft.mobile_image, name: draft.mobile_image.name || 'banner-mobile.jpg' }, 'mobile_image');
        if (draft.id) await sellerToolsService.updateBannerCampaign(draft.id, body); else await sellerToolsService.createBannerCampaign(body);
      } else {
        const body = discountPayload(draft);
        if (draft.id) await sellerToolsService.updateDiscountCampaign(draft.id, body); else await sellerToolsService.createDiscountCampaign(body);
      }
      reset(kind);
      router.replace(kind === 'banner' ? '/banners?kind=banner' : '/promotions?kind=discount');
    } catch (cause) { setError(getErrorMessage(cause)); }
    finally { setSaving(false); }
  };
  const calculatePreview = async () => {
    if (kind !== 'discount') return;
    try { setPreviewing(true); setError(null); const response = await sellerToolsService.discountCampaignPreview(discountPayload(draft)); setPreview(response.prices ?? []); }
    catch (cause) { setError(getErrorMessage(cause)); }
    finally { setPreviewing(false); }
  };
  const titles = [t('campaign.stepInfo'), t(kind === 'banner' ? 'campaign.stepCreative' : 'campaign.stepDiscount'), t('campaign.stepSchedule'), t('campaign.stepReview')];
  const isEdit = Boolean(draft.id || Number.isFinite(campaignId));
  return <Screen contentStyle={styles.bottom}>
    <AppHeader title={isEdit ? t(kind === 'banner' ? 'campaign.editBannerTitle' : 'campaign.editDiscountTitle') : t(kind === 'banner' ? 'campaign.newBannerTitle' : 'campaign.newDiscountTitle')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => step === 1 ? exit() : router.back()} right={null} />
    <View style={styles.body}><StepBar active={step} titles={titles} /><Text style={styles.wizardHeading}>{titles[step - 1]}</Text><Text style={styles.copy}>{t(step === 1 ? 'campaign.hintInfo' : step === 2 ? kind === 'banner' ? 'campaign.hintCreative' : 'campaign.hintDiscount' : step === 3 ? 'campaign.hintSchedule' : 'campaign.hintReview')}</Text>
      {error ? <Failure message={error} /> : null}
      {step === 1 ? <><Field label={t('campaign.nameLabel')} value={draft.name} onChangeText={(value) => patch(kind, { name: value })} placeholder={t('campaign.namePlaceholder')} /><Field label={t('campaign.descriptionLabel')} value={draft.description} onChangeText={(value) => patch(kind, { description: value })} placeholder={t('campaign.descriptionPlaceholder')} multiline /></> : null}
      {step === 2 ? loading ? <Loading label={t('campaign.loadingProducts')} /> : kind === 'banner' ? <BannerCreative draft={draft} patch={(value) => patch(kind, value)} options={options} /> : <DiscountSetup draft={draft} patch={(value) => patch(kind, value)} options={options} /> : null}
      {step === 3 ? <Schedule draft={draft} kind={kind} patch={(value) => patch(kind, value)} /> : null}
      {step === 4 ? <Review draft={draft} kind={kind} preview={preview} previewing={previewing} onPreview={() => void calculatePreview()} /> : null}
      <View style={styles.wizardActions}>{step > 1 ? <AppButton label={t('campaign.back')} variant="secondary" onPress={() => router.back()} style={styles.actionFlex} /> : <AppButton label={t('campaign.cancel')} variant="secondary" onPress={exit} style={styles.actionFlex} />}{step < 4 ? <AppButton label={t('campaign.continue')} disabled={loading} onPress={next} style={styles.actionFlex} /> : <AppButton label={t(saving ? 'campaign.saving' : kind === 'banner' ? 'campaign.saveBannerRequest' : draft.launch_mode === 'run_now' ? 'campaign.runCampaignNow' : 'campaign.scheduleCampaign')} disabled={saving || previewing} onPress={() => void save()} style={styles.actionFlex} />}</View>
    </View>
  </Screen>;
}

function BannerCreative({ draft, patch, options }: { draft: CampaignDraft; patch: (value: Partial<CampaignDraft>) => void; options: CampaignOptions | null }) {
  const { t } = useLanguage();
  const pick = async (key: 'desktop_image' | 'mobile_image') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .85 });
    if (!result.canceled) patch({ [key]: { uri: result.assets[0].uri, name: result.assets[0].fileName, mimeType: result.assets[0].mimeType } });
  };
  const destinations = draft.destination_type === 'product' ? options?.products ?? [] : draft.destination_type === 'category' ? options?.categories ?? [] : draft.destination_type === 'discount_campaign' ? options?.discount_campaigns ?? [] : options?.store ? [options.store] : [];
  return <><Upload label={t('campaign.desktopBanner')} value={draft.desktop_image?.uri} onPress={() => void pick('desktop_image')} required={!draft.id} /><Upload label={t('campaign.mobileBanner')} value={draft.mobile_image?.uri} onPress={() => void pick('mobile_image')} /><Field label={t('campaign.bannerTitle')} value={draft.title} onChangeText={(value) => patch({ title: value })} placeholder={t('campaign.bannerTitlePlaceholder')} /><Field label={t('campaign.fieldAltText')} value={draft.alt_text} onChangeText={(value) => patch({ alt_text: value })} placeholder={t('campaign.bannerAltPlaceholder')} /><Field label={t('campaign.fieldCta')} value={draft.cta_text} onChangeText={(value) => patch({ cta_text: value })} placeholder={t('campaign.ctaPlaceholder')} /><Select label={t('campaign.fieldPlacement')} value={draft.placement} values={placements} onChange={(value) => patch({ placement: value })} /><Select label={t('campaign.fieldDestinationType')} value={draft.destination_type} values={['product', 'category', 'store', 'discount_campaign', 'internal_url', 'external_url']} onChange={(value) => patch({ destination_type: value, destination_id: '', destination_url: '' })} />{['internal_url', 'external_url'].includes(draft.destination_type) ? <Field label={t('campaign.destinationUrl')} value={draft.destination_url} onChangeText={(value) => patch({ destination_url: value })} placeholder="https://" /> : <Select label={t('campaign.fieldDestination')} value={draft.destination_id} values={destinations.map((item) => String(item.id))} names={destinations.map((item) => item.name)} onChange={(value) => patch({ destination_id: value })} placeholder={t('campaign.chooseDestination')} />}{draft.placement === 'category_page' ? <Select label={t('campaign.placementCategory')} value={draft.category_id} values={(options?.categories ?? []).map((item) => String(item.id))} names={(options?.categories ?? []).map((item) => item.name)} onChange={(value) => patch({ category_id: value })} placeholder={t('campaign.chooseCategory')} /> : null}<Field label={t('campaign.fieldSortOrder')} value={draft.sort_order} onChangeText={(value) => patch({ sort_order: value })} keyboardType="number-pad" /></>;
}

function DiscountSetup({ draft, patch, options }: { draft: CampaignDraft; patch: (value: Partial<CampaignDraft>) => void; options: CampaignOptions | null }) {
  const { t } = useLanguage();
  const toggle = (key: 'product_ids' | 'category_ids', id: number) => patch({ [key]: draft[key].includes(id) ? draft[key].filter((item) => item !== id) : [...draft[key], id] } as Partial<CampaignDraft>);
  return <><Select label={t('campaign.discountType')} value={draft.discount_type} values={['percentage', 'fixed']} onChange={(value) => patch({ discount_type: value })} /><Field label={t(draft.discount_type === 'percentage' ? 'campaign.discountPercentage' : 'campaign.fixedDiscount')} value={draft.discount_value} onChangeText={(value) => patch({ discount_value: value })} keyboardType="decimal-pad" placeholder={draft.discount_type === 'percentage' ? '20' : '10.00'} /><Select label={t('campaign.discountScope')} value={draft.scope} values={['products', 'variants', 'categories', 'store']} onChange={(value) => patch({ scope: value, product_ids: [], category_ids: [], variants: [] })} />{draft.scope === 'products' ? <Selector label={t('campaign.eligibleProducts')} rows={options?.products ?? []} selected={draft.product_ids} onToggle={(id) => toggle('product_ids', id)} /> : null}{draft.scope === 'categories' ? <Selector label={t('campaign.eligibleCategories')} rows={options?.categories ?? []} selected={draft.category_ids} onToggle={(id) => toggle('category_ids', id)} /> : null}{draft.scope === 'store' ? <Notice text={t('campaign.discountAppliesAll')} /> : null}{draft.scope === 'variants' ? <VariantSelector products={options?.products ?? []} selected={draft.variants} onChange={(variants) => patch({ variants })} /> : null}</>;
}

function VariantSelector({ products, selected, onChange }: { products: CampaignOptions['products']; selected: { variant_type: string; variant_id: number }[]; onChange: (value: { variant_type: string; variant_id: number }[]) => void }) {
  const { t } = useLanguage();
  const flip = (variant_type: string, variant_id: number) => {
    const exists = selected.some((item) => item.variant_type === variant_type && item.variant_id === variant_id);
    onChange(exists ? selected.filter((item) => item.variant_type !== variant_type || item.variant_id !== variant_id) : [...selected, { variant_type, variant_id }]);
  };
  const groups = (product: CampaignOptions['products'][number]) => [['variant_id', product.variants, (value: { name?: string; color_name?: string; id: number }) => value.name || value.color_name || translate('campaign.variantFallback', { id: value.id })], ['frame_size_id', product.frame_sizes, (value: { size_label?: string; id: number }) => value.size_label || translate('campaign.frameSizeFallback', { id: value.id })], ['product_size_volume_id', product.size_volume_variants, (value: { size_volume?: string; id: number }) => value.size_volume || translate('campaign.sizeFallback', { id: value.id })], ['eye_hygiene_variant_id', product.eye_hygiene_variants, (value: { name?: string; id: number }) => value.name || translate('campaign.variantFallback', { id: value.id })]] as const;
  return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{t('campaign.eligibleVariants')}</Text><View style={styles.selector}>{products.map((product) => <View key={product.id}><Text style={styles.variantProduct}>{product.name}</Text>{groups(product).flatMap(([type, values, name]) => (values || []).map((value) => { const active = selected.some((item) => item.variant_type === type && item.variant_id === value.id); return <Pressable key={`${type}:${value.id}`} onPress={() => flip(type, value.id)} style={styles.selectorRow}><MaterialCommunityIcons name={active ? 'checkbox-marked' : 'checkbox-blank-outline'} size={21} color={colors.blue} /><Text style={styles.selectorText}>{name(value as never)}</Text></Pressable>; }))}</View>)}</View></View>;
}

function Schedule({ draft, kind, patch }: { draft: CampaignDraft; kind: CampaignKind; patch: (value: Partial<CampaignDraft>) => void }) {
  const { t } = useLanguage();
  const minEnd = kind === 'discount' && draft.launch_mode === 'run_now' ? new Date() : localInputDate(draft.starts_at);
  return <><Text style={styles.fieldLabel}>{t('campaign.launchMode')}</Text>{kind === 'discount' ? <View style={styles.choiceRow}><Choice label={t('campaign.runNow')} active={draft.launch_mode === 'run_now'} onPress={() => patch({ launch_mode: 'run_now' })} /><Choice label={t('campaign.scheduleLater')} active={draft.launch_mode === 'schedule'} onPress={() => patch({ launch_mode: 'schedule' })} /></View> : null}{kind === 'banner' || draft.launch_mode === 'schedule' ? <DateTimeField label={t('campaign.startDateTime')} value={draft.starts_at} onChange={(starts_at) => patch({ starts_at })} minimumDate={new Date()} /> : <Notice text={t('campaign.runNowHint')} /> }<DateTimeField label={t('campaign.endDateTime')} value={draft.ends_at} onChange={(ends_at) => patch({ ends_at })} minimumDate={minEnd} /><Text style={styles.timeHint}>{t('campaign.localTimezone', { tz: localTimezone() })}</Text>{kind === 'discount' ? <><Field label={t('campaign.minOrderAmount')} value={draft.minimum_order_amount} onChangeText={(value) => patch({ minimum_order_amount: value })} keyboardType="decimal-pad" /><Field label={t('campaign.minimumQuantity')} value={draft.minimum_quantity} onChangeText={(value) => patch({ minimum_quantity: value })} keyboardType="number-pad" /><Field label={t('campaign.campaignUsageLimit')} value={draft.usage_limit} onChangeText={(value) => patch({ usage_limit: value })} keyboardType="number-pad" /><Field label={t('campaign.perBuyerLimit')} value={draft.per_buyer_limit} onChangeText={(value) => patch({ per_buyer_limit: value })} keyboardType="number-pad" /><Field label={t('campaign.priorityLabel')} value={draft.priority} onChangeText={(value) => patch({ priority: value })} keyboardType="number-pad" /><Toggle label={t('campaign.allowStacking')} value={draft.stacking} onChange={(value) => patch({ stacking: value })} /></> : <Toggle label={t('campaign.bannerVisibleWhenApproved')} value={draft.is_active} onChange={(value) => patch({ is_active: value })} />}</>;
}

function Review({ draft, kind, preview, previewing, onPreview }: { draft: CampaignDraft; kind: CampaignKind; preview: { name: string; original_price: number | string; discounted_price: number | string; campaign_name?: string | null }[]; previewing: boolean; onPreview: () => void }) {
  const { t } = useLanguage();
  return <View style={styles.review}><Detail label={t('campaign.stepCampaign')} value={draft.name || t('campaign.untitled')} /><Detail label={t('campaign.stepSchedule')} value={`${kind === 'discount' && draft.launch_mode === 'run_now' ? t('campaign.runNow') : dateTime(iso(draft.starts_at))} → ${dateTime(iso(draft.ends_at))}`} /><Detail label={t(kind === 'banner' ? 'campaign.fieldPlacement' : 'campaign.fieldDiscount')} value={kind === 'banner' ? `${label(draft.placement)} → ${label(draft.destination_type)}` : `${t(draft.discount_type === 'percentage' ? 'campaign.discountPercent' : 'campaign.discountFixed', { value: draft.discount_value })} · ${label(draft.scope)}`} />{kind === 'banner' ? <Notice text={t('campaign.stepBannerHint')} /> : <><Notice text={t('campaign.stepDiscountHint')} /><AppButton label={t(previewing ? 'campaign.calculating' : 'campaign.calculatePreview')} variant="secondary" disabled={previewing} onPress={onPreview} style={styles.previewButton} />{preview.map((item, index) => <View style={styles.previewRow} key={`${item.name}-${index}`}><Text style={styles.previewName}>{item.name}</Text><Text style={styles.previewValue}>{money(item.original_price)} → {money(item.discounted_price)}</Text></View>)}</>}</View>;
}

function validSchedule(draft: CampaignDraft, kind: CampaignKind) {
  const now = Date.now(); const starts = localInputDate(draft.starts_at).getTime(); const ends = localInputDate(draft.ends_at).getTime();
  return Number.isFinite(ends) && ends > now && ends > (kind === 'discount' && draft.launch_mode === 'run_now' ? now : starts) && !(kind === 'discount' && draft.launch_mode === 'schedule' && starts <= now);
}
function scheduleError(draft: CampaignDraft, kind: CampaignKind) {
  const starts = localInputDate(draft.starts_at).getTime(); const ends = localInputDate(draft.ends_at).getTime();
  if (ends <= Date.now()) return 'Choose an end date and time in the future.';
  if (kind === 'discount' && draft.launch_mode === 'schedule' && starts <= Date.now()) return 'Choose a future start date and time when scheduling a campaign.';
  return 'The end date and time must be after the campaign start.';
}

function draftFromCampaign(row: SellerCampaign): CampaignDraft {
  const fresh = freshCampaignDraft(); const creative = row.creatives?.[0];
  const launch_mode: CampaignDraft['launch_mode'] = ['scheduled', 'paused'].includes(row.status) ? 'schedule' : 'run_now';
  const starts = localInputDate(row.starts_at);
  const restart = launch_mode === 'schedule' && starts.getTime() <= Date.now() ? new Date(Date.now() + 5 * 60_000) : starts;
  return { ...fresh, id: row.id, name: row.name, description: row.description || '', scope: row.scope || 'products', discount_type: row.discount_type || 'percentage', discount_value: String(row.discount_value ?? 10), product_ids: row.products?.map((item) => item.id) ?? [], category_ids: row.categories?.map((item) => item.id) ?? [], variants: row.variants ?? [], starts_at: dateToLocalInput(restart), ends_at: dateToLocalInput(localInputDate(row.ends_at)), launch_mode, minimum_order_amount: row.minimum_order_amount == null ? '' : String(row.minimum_order_amount), minimum_quantity: String(row.minimum_quantity ?? 1), usage_limit: row.usage_limit == null ? '' : String(row.usage_limit), per_buyer_limit: row.per_buyer_limit == null ? '' : String(row.per_buyer_limit), priority: String(row.priority ?? 0), stacking: Boolean(row.stacking), placement: row.placement || 'homepage_hero', destination_type: row.destination_type || 'product', destination_id: row.destination_id ? String(row.destination_id) : '', destination_url: row.destination_url || '', category_id: row.targeting?.category_id ? String(row.targeting.category_id) : '', title: creative?.title || '', alt_text: creative?.alt_text || '', cta_text: creative?.cta_text || 'Explore', sort_order: String(creative?.sort_order ?? 0), is_active: creative?.is_active !== false };
}

function discountPayload(draft: CampaignDraft) { return { name: draft.name.trim(), description: draft.description.trim() || null, scope: draft.scope, discount_type: draft.discount_type, discount_value: Number(draft.discount_value), product_ids: draft.product_ids, category_ids: draft.category_ids, variants: draft.variants, starts_at: iso(draft.starts_at), ends_at: iso(draft.ends_at), schedule_timezone: localTimezone(), launch_mode: draft.launch_mode, minimum_order_amount: number(draft.minimum_order_amount), minimum_quantity: number(draft.minimum_quantity), usage_limit: number(draft.usage_limit), per_buyer_limit: number(draft.per_buyer_limit), priority: Number(draft.priority || 0), stacking: draft.stacking }; }
function bannerPayload(draft: CampaignDraft) { return { name: draft.name.trim(), description: draft.description.trim() || null, title: draft.title.trim(), alt_text: draft.alt_text.trim(), cta_text: draft.cta_text.trim(), placement: draft.placement, destination_type: draft.destination_type, destination_id: draft.destination_id || null, destination_url: draft.destination_url || null, targeting: draft.category_id || '', starts_at: iso(draft.starts_at), ends_at: iso(draft.ends_at), schedule_timezone: localTimezone(), sort_order: Number(draft.sort_order || 0), is_active: draft.is_active ? 1 : 0, type: 'organic' }; }

function FilterRail({ values, current, allLabel, onChange }: { values: string[]; current: string; allLabel: string; onChange: (value: string) => void }) { return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{values.map((value) => <Chip key={value || 'all'} label={value ? label(value) : allLabel} active={current === value} onPress={() => onChange(value)} />)}</ScrollView>; }
function DateTimeField({ label: fieldLabel, value, onChange, minimumDate }: { label: string; value: string; onChange: (value: string) => void; minimumDate?: Date }) { const [mode, setMode] = useState<PickerMode>(null); const selected = localInputDate(value); const update = (event: DateTimePickerEvent, picked?: Date) => { if (Platform.OS === 'android') setMode(null); if (event.type !== 'set' || !picked) return; const next = new Date(selected); if (mode === 'date') { next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate()); onChange(dateToLocalInput(next)); if (Platform.OS === 'android') setTimeout(() => setMode('time'), 0); } if (mode === 'time') { next.setHours(picked.getHours(), picked.getMinutes(), 0, 0); onChange(dateToLocalInput(next)); } }; return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{fieldLabel}</Text><View style={styles.dateTimeRow}><Pressable onPress={() => setMode('date')} style={styles.dateTimeButton}><MaterialCommunityIcons name="calendar-outline" size={18} color={colors.blue} /><Text style={styles.dateTimeText}>{selected.toLocaleDateString(localeTag(getActiveLanguage()), { dateStyle: 'medium' })}</Text></Pressable><Pressable onPress={() => setMode('time')} style={styles.dateTimeButton}><MaterialCommunityIcons name="clock-outline" size={18} color={colors.blue} /><Text style={styles.dateTimeText}>{selected.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></Pressable></View>{mode ? <DateTimePicker value={selected} mode={mode} display={Platform.OS === 'ios' ? 'inline' : 'default'} minimumDate={mode === 'date' ? minimumDate : undefined} onChange={update} /> : null}</View>; }
function TargetList({ title, rows }: { title: string; rows: string[] }) { return <View style={styles.targetList}><Text style={styles.targetTitle}>{title}</Text>{rows.map((item) => <Text key={item} style={styles.targetText}>• {item}</Text>)}</View>; }
function AuditRow({ audit }: { audit: CampaignAudit }) { const snapshot = typeof audit.snapshot === 'string' ? tryParse(audit.snapshot) : audit.snapshot; const schedule = snapshot && typeof snapshot === 'object' && 'starts_at' in snapshot ? `${dateTime(String(snapshot.starts_at))} → ${dateTime(String(snapshot.ends_at ?? ''))}` : null; return <View style={styles.audit}><View style={styles.auditDot} /><View style={{ flex: 1 }}><Text style={styles.auditTitle}>{label(audit.action)}</Text><Text style={styles.auditText}>{audit.reason || 'Campaign activity recorded.'}</Text><Text style={styles.auditDate}>{dateTime(audit.created_at)}</Text>{schedule ? <Text style={styles.auditText}>Scheduled: {schedule}</Text> : null}</View></View>; }
function tryParse(value: string): Record<string, unknown> | null { try { return JSON.parse(value) as Record<string, unknown>; } catch { return null; } }
function formatMetric(key: string, value: number | string | null) { return /revenue|discount|spend|amount/.test(key) ? money(value) : String(value ?? 0); }
function actionIcon(action: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] { return action === 'pause' ? 'pause-circle-outline' : action === 'resume' || action === 'publish' || action === 'submit' ? 'play-circle-outline' : action === 'duplicate' ? 'content-copy' : action === 'delete' ? 'trash-can-outline' : 'dots-horizontal-circle-outline'; }
function Metric({ label: metricLabel, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{metricLabel}</Text></View>; }
function Field({ label: fieldLabel, multiline, ...props }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'decimal-pad' | 'number-pad' }) { return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{fieldLabel}</Text><TextInput {...props} multiline={multiline} placeholderTextColor="#7C8BA0" style={[styles.field, multiline && styles.textarea]} /></View>; }
function Select({ label: fieldLabel, value, values, names, onChange, placeholder }: { label: string; value: string; values: string[]; names?: string[]; onChange: (value: string) => void; placeholder?: string }) { return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{fieldLabel}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectChoices}>{placeholder ? <Choice label={placeholder} active={!value} onPress={() => onChange('')} /> : null}{values.map((item, index) => <Choice key={item} label={names?.[index] || label(item)} active={value === item} onPress={() => onChange(item)} />)}</ScrollView></View>; }
function Selector({ label: fieldLabel, rows, selected, onToggle }: { label: string; rows: { id: number; name: string }[]; selected: number[]; onToggle: (id: number) => void }) { return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{fieldLabel}</Text><View style={styles.selector}>{rows.map((row) => <Pressable key={row.id} onPress={() => onToggle(row.id)} style={styles.selectorRow}><MaterialCommunityIcons name={selected.includes(row.id) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={21} color={colors.blue} /><Text style={styles.selectorText}>{row.name}</Text></Pressable>)}</View></View>; }
function Choice({ label: choiceLabel, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{choiceLabel}</Text></Pressable>; }
function Toggle({ label: toggleLabel, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <View style={styles.toggle}><Text style={styles.toggleText}>{toggleLabel}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: '#CBD5E1', true: '#8AC0FF' }} thumbColor={value ? colors.blue : '#FFFFFF'} /></View>; }
function Upload({ label: uploadLabel, value, required, onPress }: { label: string; value?: string; required?: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.upload}>{value ? <Image source={{ uri: value }} style={styles.uploadImage} /> : <MaterialCommunityIcons name="image-plus" size={25} color={colors.blue} />}<View style={{ flex: 1 }}><Text style={styles.uploadTitle}>{uploadLabel}{required ? ' *' : ''}</Text><Text style={styles.uploadCopy}>{value ? 'Image selected · tap to replace' : 'Choose PNG, JPG or WEBP'}</Text></View><MaterialCommunityIcons name="chevron-right" size={20} color="#8B9AAF" /></Pressable>; }
function StepBar({ active, titles }: { active: number; titles: string[] }) { return <View style={styles.stepBar}>{titles.map((title, index) => <View key={title} style={styles.stepWrap}><View style={[styles.stepDot, index + 1 <= active && styles.stepDotActive]}><Text style={[styles.stepNumber, index + 1 <= active && styles.stepNumberActive]}>{index + 1}</Text></View><Text numberOfLines={1} style={[styles.stepText, index + 1 === active && styles.stepTextActive]}>{title}</Text></View>)}</View>; }
function Status({ value }: { value: string }) { return <View style={[styles.status, value === 'active' && styles.statusActive]}><Text style={[styles.statusText, value === 'active' && styles.statusTextActive]}>{label(value)}</Text></View>; }
function Detail({ label: detailLabel, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{detailLabel}</Text><Text selectable style={styles.detailValue}>{value}</Text></View>; }
function Notice({ text, danger }: { text: string; danger?: boolean }) { return <View style={[styles.notice, danger && styles.noticeDanger]}><MaterialCommunityIcons name={danger ? 'alert-circle-outline' : 'information-outline'} size={18} color={danger ? colors.red : colors.blue} /><Text style={[styles.noticeText, danger && styles.noticeDangerText]}>{text}</Text></View>; }
function ActionPill({ label: pillLabel, icon, onPress, disabled, primary, destructive }: { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; onPress: () => void; disabled: boolean; primary?: boolean; destructive?: boolean }) { return <Pressable onPress={onPress} disabled={disabled} style={[styles.actionPill, primary && styles.actionPillPrimary, destructive && styles.actionPillDestructive, disabled && styles.disabled]}><MaterialCommunityIcons name={icon} size={16} color={primary ? '#FFFFFF' : destructive ? colors.red : colors.blue} /><Text style={[styles.actionPillText, primary && styles.actionPillPrimaryText, destructive && styles.actionPillDestructiveText]}>{pillLabel}</Text></Pressable>; }
function Loading({ label: loadingLabel }: { label: string }) { return <View style={styles.loading}><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.copy}>{loadingLabel}</Text></View>; }
function Failure({ message }: { message: string }) { return <View style={styles.failure}><MaterialCommunityIcons name="alert-circle-outline" size={19} color={colors.red} /><Text style={styles.failureText}>{message}</Text></View>; }
function Empty({ title, copy, action, onAction }: { title: string; copy: string; action?: string; onAction?: () => void }) { return <View style={styles.empty}><MaterialCommunityIcons name="image-off-outline" size={32} color={colors.blue} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.copy}>{copy}</Text>{action && onAction ? <AppButton label={action} onPress={onAction} /> : null}</View>; }
function Chip({ label: chipLabel, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{chipLabel}</Text></Pressable>; }

const styles = StyleSheet.create({
  bottom: { paddingBottom: 128 }, body: { padding: 20 }, overline: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }, heading: { color: colors.ink, fontSize: 25, fontWeight: '800', letterSpacing: -1, marginTop: 4 }, copy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, headerAdd: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, ...shadow.card }, search: { minHeight: 48, marginTop: 15, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow.card }, searchInput: { flex: 1, paddingVertical: 11, color: colors.ink, fontSize: 13 }, chips: { gap: 8, paddingTop: 12, paddingBottom: 1 }, chip: { minHeight: 34, paddingHorizontal: 11, borderRadius: 17, backgroundColor: '#EAF0F7', justifyContent: 'center' }, chipActive: { backgroundColor: colors.blue }, chipText: { color: colors.muted, fontSize: 10, fontWeight: '800' }, chipTextActive: { color: '#FFFFFF' }, list: { gap: 10, marginTop: 14 }, campaignCard: { minHeight: 118, padding: 11, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow.card }, bannerImage: { height: 92, width: 78, borderRadius: 13, backgroundColor: '#E7F1FF' }, campaignIcon: { height: 58, width: 58, borderRadius: 16, backgroundColor: '#E7F1FF', alignItems: 'center', justifyContent: 'center' }, campaignCopy: { flex: 1, minWidth: 0 }, rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 }, cardTitle: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '800' }, cardText: { color: colors.muted, fontSize: 10, marginTop: 3 }, cardMeta: { color: '#718096', fontSize: 9, marginTop: 4 }, analytics: { color: colors.blue, fontSize: 9, marginTop: 4, fontWeight: '800' }, status: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: '#EEF2F6' }, statusActive: { backgroundColor: colors.greenSoft }, statusText: { color: '#526277', fontSize: 8, fontWeight: '800' }, statusTextActive: { color: colors.green }, loading: { minHeight: 210, alignItems: 'center', justifyContent: 'center', gap: 10 }, failure: { padding: 11, borderRadius: 11, backgroundColor: '#FFF0F1', flexDirection: 'row', gap: 8, marginTop: 12 }, failureText: { flex: 1, color: colors.red, fontSize: 11, lineHeight: 16, fontWeight: '700' }, empty: { minHeight: 200, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 8 }, emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'center' }, topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 }, actionPill: { minHeight: 36, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#EAF3FF', flexDirection: 'row', gap: 6, alignItems: 'center' }, actionPillPrimary: { backgroundColor: colors.blue }, actionPillDestructive: { backgroundColor: '#FFF0F1', borderWidth: 1, borderColor: '#FFD1D5' }, actionPillText: { color: colors.blue, fontWeight: '800', fontSize: 10 }, actionPillPrimaryText: { color: '#FFFFFF' }, actionPillDestructiveText: { color: colors.red }, disabled: { opacity: .55 }, detailHero: { minHeight: 106, padding: 13, borderRadius: radius.lg, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', gap: 11 }, detailHeroImage: { height: 79, width: 80, borderRadius: 14, backgroundColor: '#E7F1FF' }, detailHeroIcon: { height: 64, width: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }, detailHeroCopy: { flex: 1, minWidth: 0 }, detailName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' }, detailSub: { color: '#DCEBFF', fontSize: 11, marginTop: 4, marginBottom: 6 }, description: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 15 }, section: { color: '#718096', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 21, marginBottom: 8 }, detail: { minHeight: 44, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#E3EAF3', gap: 10 }, detailLabel: { color: colors.muted, fontSize: 11, flex: 1 }, detailValue: { maxWidth: '62%', color: colors.ink, fontSize: 11, textAlign: 'right', fontWeight: '800' }, creativeImage: { width: '100%', height: 160, borderRadius: 14, marginBottom: 8, backgroundColor: '#E7F1FF' }, targetList: { padding: 11, borderRadius: 12, backgroundColor: colors.surface, marginBottom: 9, ...shadow.card }, targetTitle: { color: colors.ink, fontSize: 11, fontWeight: '800', marginBottom: 4 }, targetText: { color: colors.muted, fontSize: 11, lineHeight: 18 }, usage: { minHeight: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderColor: '#E3EAF3' }, usageTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' }, usageText: { color: colors.muted, fontSize: 9, marginTop: 3 }, usageValue: { color: colors.blue, fontSize: 12, fontWeight: '800', textAlign: 'right' }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metric: { width: '31%', minHeight: 66, padding: 9, borderRadius: 12, backgroundColor: colors.surface, ...shadow.card }, metricValue: { color: colors.blue, fontSize: 14, fontWeight: '800' }, metricLabel: { color: colors.subtle, fontSize: 8, marginTop: 4 }, audit: { minHeight: 52, flexDirection: 'row', gap: 9, paddingVertical: 9, borderBottomWidth: 1, borderColor: '#E3EAF3' }, auditDot: { height: 8, width: 8, borderRadius: 4, marginTop: 4, backgroundColor: colors.blue }, auditTitle: { color: colors.ink, fontSize: 11, fontWeight: '800' }, auditText: { color: colors.muted, fontSize: 10, marginTop: 2 }, auditDate: { color: colors.subtle, fontSize: 9, marginTop: 3 }, stepBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }, stepWrap: { width: '24%', alignItems: 'center' }, stepDot: { height: 27, width: 27, borderRadius: 14, backgroundColor: '#E3EAF3', justifyContent: 'center', alignItems: 'center' }, stepDotActive: { backgroundColor: colors.blue }, stepNumber: { color: colors.muted, fontSize: 11, fontWeight: '800' }, stepNumberActive: { color: '#FFFFFF' }, stepText: { color: colors.subtle, fontSize: 8, marginTop: 4, textAlign: 'center' }, stepTextActive: { color: colors.blue, fontWeight: '800' }, wizardHeading: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -.7 }, wizardActions: { flexDirection: 'row', gap: 9, marginTop: 25 }, actionFlex: { flex: 1 }, fieldGroup: { marginTop: 14 }, fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 6 }, field: { minHeight: 48, paddingHorizontal: 12, borderRadius: 11, backgroundColor: colors.surface, color: colors.ink, fontSize: 13, ...shadow.card }, textarea: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' }, selectChoices: { gap: 7, paddingVertical: 1, paddingRight: 12 }, choiceRow: { flexDirection: 'row', gap: 8 }, choice: { minHeight: 35, paddingHorizontal: 11, borderRadius: 17, backgroundColor: '#EAF0F7', justifyContent: 'center' }, choiceActive: { backgroundColor: colors.blue }, choiceText: { color: colors.muted, fontSize: 10, fontWeight: '800' }, choiceTextActive: { color: '#FFFFFF' }, selector: { maxHeight: 235, borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden', ...shadow.card }, variantProduct: { paddingHorizontal: 11, paddingTop: 11, paddingBottom: 5, color: colors.ink, fontSize: 11, fontWeight: '800', backgroundColor: '#F4F7FB' }, selectorRow: { minHeight: 43, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#E8EDF4' }, selectorText: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '700' }, toggle: { minHeight: 58, marginTop: 14, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow.card }, toggleText: { color: colors.ink, fontSize: 12, fontWeight: '800' }, upload: { minHeight: 72, marginTop: 14, padding: 10, borderRadius: 13, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow.card }, uploadImage: { height: 50, width: 50, borderRadius: 11 }, uploadTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, uploadCopy: { color: colors.muted, fontSize: 10, marginTop: 3 }, dateTimeRow: { flexDirection: 'row', gap: 8 }, dateTimeButton: { flex: 1, minHeight: 47, paddingHorizontal: 10, borderRadius: 11, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 7, ...shadow.card }, dateTimeText: { color: colors.ink, fontSize: 11, fontWeight: '700' }, timeHint: { marginTop: 10, color: '#285B96', fontSize: 10, lineHeight: 15 }, review: { marginTop: 14, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card }, previewButton: { marginTop: 14 }, previewRow: { minHeight: 40, paddingVertical: 9, borderBottomWidth: 1, borderColor: '#E3EAF3', flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, previewName: { color: colors.ink, flex: 1, fontSize: 11, fontWeight: '700' }, previewValue: { color: colors.blue, fontSize: 10, fontWeight: '800' }, notice: { marginTop: 14, padding: 11, borderRadius: 11, backgroundColor: '#EAF3FF', flexDirection: 'row', gap: 8 }, noticeDanger: { backgroundColor: '#FFF0F1' }, noticeText: { flex: 1, color: '#285B96', fontSize: 11, lineHeight: 16, fontWeight: '700' }, noticeDangerText: { color: colors.red },
  pagination: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  pageText: { color: colors.muted, fontSize: 10, fontWeight: '800', textAlign: 'center' },
});
