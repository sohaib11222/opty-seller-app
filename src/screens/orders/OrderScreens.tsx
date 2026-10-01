import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { AppButton } from '../../components/ui/AppButton';
import { AppHeader } from '../../components/ui/AppHeader';
import { Screen } from '../../components/ui/Screen';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { DateField } from '../../components/ui/DateField';
import { MainHeaderActions } from '../../components/ui/MainHeaderActions';
import { getErrorMessage } from '../../services/api/client';
import { orderService } from '../../services/orders/order.service';
import type { AcceptOrderInput, CurrencyValue, OrderLine, OrderStatus, StoreOrder } from '../../types/orders';
import { colors, radius, shadow } from '../../theme/tokens';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { goBack } from '../../navigation/back';
import { useSellerBadges } from '../../features/notifications/SellerBadgeContext';
import { useLanguage, type Language } from '../../features/i18n/LanguageContext';
import { getActiveLanguage } from '../../features/i18n/translate';

const FILTERS: { key: string; value?: OrderStatus }[] = [
  { key: 'orders.filter.all' },
  { key: 'orders.filter.pending', value: 'pending' },
  { key: 'orders.filter.awaitingPayment', value: 'awaiting_payment' },
  { key: 'orders.filter.paid', value: 'paid' },
  { key: 'orders.filter.outForDelivery', value: 'out_for_delivery' },
];

const STATUS_KEYS: Record<string, string> = {
  pending: 'orderStatus.pending',
  awaiting_payment: 'orderStatus.awaiting_payment',
  paid: 'orderStatus.paid',
  processing: 'orderStatus.processing',
  out_for_delivery: 'orderStatus.out_for_delivery',
  delivered: 'orderStatus.delivered',
  cancelled: 'orderStatus.cancelled',
  rejected: 'orderStatus.rejected',
};

const statusStyle: Record<string, { backgroundColor: string; color: string }> = {
  pending: { backgroundColor: colors.amberSoft, color: '#9B6208' },
  awaiting_payment: { backgroundColor: '#E7F2FF', color: '#175BAA' },
  paid: { backgroundColor: colors.greenSoft, color: colors.green },
  processing: { backgroundColor: '#E7F2FF', color: '#175BAA' },
  out_for_delivery: { backgroundColor: '#EEE8FF', color: '#6244AD' },
  delivered: { backgroundColor: '#EEF2F6', color: '#526277' },
  cancelled: { backgroundColor: '#FFF0F1', color: colors.red },
  rejected: { backgroundColor: '#FFF0F1', color: colors.red },
};

function currency(value: CurrencyValue) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(getActiveLanguage() === 'it' ? 'it-IT' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(Number.isFinite(amount) ? amount : 0);
}

function dateText(value: string | null | undefined, includeTime = false, locale: Language = getActiveLanguage()) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(locale === 'it' ? 'it-IT' : 'en-IE', includeTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function OrdersScreen() {
  const { t } = useLanguage();
  const { markOrdersRead } = useSellerBadges();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | undefined>();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState({ current: 1, last: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage = 1, append = false) => {
    try {
      if (append) setLoadingMore(true); else setLoading(true);
      setError(null);
      // The seller website exposes up to 100 store orders per page. Keeping the same
      // window locally lets the search cover order IDs, buyers, statuses and item SKUs.
      const response = await orderService.getOrders({ status: selectedStatus, page: nextPage, per_page: 100 });
      setOrders((current) => append ? [...current, ...response.data] : response.data);
      setPage({ current: response.current_page, last: response.last_page, total: response.total });
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedStatus]);

  // Changing the website-backed status filter must immediately refetch instead
  // of leaving the previous list visible until the background polling interval.
  useAutoRefresh(load, true, 20_000, selectedStatus ?? 'all');
  const visibleOrders = useMemo(() => filterOrders(orders, search), [orders, search]);
  useEffect(() => { void markOrdersRead().catch(() => undefined); }, [markOrdersRead]);

  return (
    <Screen contentStyle={styles.screenContent}>
      <AppHeader title={t('orders.title')} right={<View style={styles.headerActions}><Pressable accessibilityLabel={t('orders.searchLabel')} onPress={() => setSearchOpen((current) => !current)} style={styles.headerSearch}><MaterialCommunityIcons name="magnify" size={22} color="#3E5877" /></Pressable><MainHeaderActions /></View>} />
      <View style={styles.pageIntro}>
        <Text style={styles.overline}>{t('orders.overline')}</Text>
        <Text style={styles.pageTitle}>{t('orders.pageTitle')}</Text>
        <Text style={styles.pageSubtitle}>{page.total ? t(page.total === 1 ? 'orders.subtitleCount' : 'orders.subtitleCountPlural', { count: page.total }) : t('orders.subtitleDefault')}</Text>
      </View>

      {searchOpen ? <View style={styles.searchWrap}><MaterialCommunityIcons name="magnify" size={20} color="#718096" /><TextInput autoFocus value={search} onChangeText={setSearch} placeholder={t('orders.searchPlaceholder')} placeholderTextColor="#7C8BA0" style={styles.searchInput} /><Pressable onPress={() => { setSearch(''); setSearchOpen(false); }} hitSlop={8}><MaterialCommunityIcons name="close" size={19} color="#718096" /></Pressable></View> : null}

      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroller}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const active = selectedStatus === filter.value;
            return <Pressable key={filter.key} onPress={() => setSelectedStatus(filter.value)} style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{t(filter.key)}</Text>
            </Pressable>;
          })}
        </ScrollView>
      </View>

      {loading ? <LoadingState label={t('orders.loading')} /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && visibleOrders.length === 0 ? <EmptyOrders filtered={Boolean(selectedStatus || search)} /> : null}
      {!loading && !error ? <View style={styles.orderList}>{visibleOrders.map((order) => <OrderListCard key={order.id} order={order} />)}</View> : null}
      {!loading && !error && page.current < page.last ? <AppButton label={loadingMore ? t('orders.loadingMore') : t('orders.loadMore')} variant="secondary" disabled={loadingMore} onPress={() => void load(page.current + 1, true)} style={styles.loadMore} /> : null}
    </Screen>
  );
}

function filterOrders(orders: StoreOrder[], search: string) {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return orders;
  return orders.filter((order) => [
    order.id, order.order?.order_no, order.status, order.payment_status, order.total, order.subtotal,
    order.order?.user?.name, order.order?.user?.email, order.order?.user?.phone,
    ...(order.items ?? []).flatMap((item) => [item.product_name, item.product_sku]),
  ].filter(Boolean).some((value) => String(value).toLocaleLowerCase().includes(query)));
}

function OrderListCard({ order }: { order: StoreOrder }) {
  const { t, language } = useLanguage();
  const buyer = order.order?.user;
  const itemCount = order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ?? 0;
  return <Pressable accessibilityRole="button" accessibilityLabel={t('orders.openOrder', { number: order.order?.order_no ?? order.id })} onPress={() => router.push({ pathname: '/order-details/[id]', params: { id: String(order.id) } })} style={styles.orderCard}>
    <View style={styles.orderIcon}><MaterialCommunityIcons name="clipboard-text-outline" size={21} color="#326789" /></View>
    <View style={styles.orderCopy}>
      <View style={styles.orderHeading}><Text numberOfLines={1} style={styles.orderNumber}>#{order.order?.order_no ?? order.id}</Text><StatusBadge status={order.status} /></View>
      <Text numberOfLines={1} style={styles.orderBuyer}>{buyer?.name ?? t('orders.customer')}</Text>
      <Text numberOfLines={1} style={styles.orderMeta}>{t(itemCount === 1 ? 'orders.itemsCount' : 'orders.itemsCountPlural', { count: itemCount })} · {dateText(order.created_at, false, language)}</Text>
    </View>
    <View style={styles.orderEnd}><Text style={styles.orderAmount}>{currency(order.total)}</Text><MaterialCommunityIcons name="chevron-right" size={20} color="#91A0B3" /></View>
  </Pressable>;
}

export function OrderDetailsScreen() {
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [form, setForm] = useState<OrderActionSheetMode>(null);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!Number.isFinite(orderId) || orderId < 1) {
      setError(t('orderError.invalidLink'));
      setLoading(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      setError(null);
      setOrder(await orderService.getOrder(orderId));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  useAutoRefresh(load);

  const perform = async (key: string, request: () => Promise<StoreOrder>, success: string) => {
    try {
      setBusyAction(key);
      setError(null);
      const updated = await request();
      setOrder(updated);
      setNotice(success);
      setForm(null);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusyAction(null);
    }
  };

  const submitAccept = () => {
    const fee = Number(deliveryFee);
    if (!Number.isFinite(fee) || fee < 0 || !estimatedDeliveryDate || !deliveryMethod.trim()) {
      setError(t('orderError.acceptFields'));
      return;
    }
    const data: AcceptOrderInput = { delivery_fee: fee, estimated_delivery_date: estimatedDeliveryDate, delivery_method: deliveryMethod.trim(), delivery_notes: deliveryNotes.trim() };
    void perform('accept', () => orderService.acceptOrder(orderId, data), t('orderNotice.quoteSent'));
  };

  const submitReject = () => {
    if (!rejectionReason.trim()) { setError(t('orderError.rejectReason')); return; }
    void perform('reject', () => orderService.rejectOrder(orderId, rejectionReason.trim()), t('orderNotice.rejected'));
  };

  const requestCode = () => void perform('request-code', () => orderService.requestDeliveryCode(orderId), t('orderNotice.codeRequested'));

  const confirmDelivery = () => {
    if (!/^\d{6}$/.test(deliveryCode)) { setError(t('orderError.deliveryCode')); return; }
    void perform('deliver', () => orderService.markDelivered(orderId, deliveryCode), t('orderNotice.delivered'));
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <AppHeader title={t('orderDetails.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => goBack('/orders')} right={null} />
      {loading ? <LoadingState label={t('orderDetails.loading')} /> : null}
      {error && !order ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {order ? <View style={styles.detailBody}>
        {error ? <InlineAlert tone="error" message={error} /> : null}
        {notice ? <InlineAlert tone="success" message={notice} /> : null}
        <OrderSummary order={order} />
        <OrderActions order={order} busyAction={busyAction} onForm={setForm} />
        <CustomerCard order={order} />
        <ItemsCard items={order.items ?? []} />
        <DeliveryCard order={order} />
        <PaymentCard order={order} />
        <PricingCard order={order} />
        <TimelineCard order={order} />
        {order.dispute_reason ? <InfoCard title={t('orderDetails.dispute')} icon="alert-circle-outline" tone="error" message={order.dispute_reason} /> : null}
        {order.rejection_reason ? <InfoCard title={t('orderDetails.rejectionReason')} icon="close-circle-outline" tone="error" message={order.rejection_reason} /> : null}
        <OrderActionSheet
          mode={form}
          busyAction={busyAction}
          deliveryFee={deliveryFee}
          estimatedDeliveryDate={estimatedDeliveryDate}
          deliveryMethod={deliveryMethod}
          deliveryNotes={deliveryNotes}
          rejectionReason={rejectionReason}
          deliveryCode={deliveryCode}
          onClose={() => setForm(null)}
          onDeliveryFee={setDeliveryFee}
          onEstimatedDate={setEstimatedDeliveryDate}
          onDeliveryMethod={setDeliveryMethod}
          onDeliveryNotes={setDeliveryNotes}
          onRejectionReason={setRejectionReason}
          onDeliveryCode={setDeliveryCode}
          onAccept={submitAccept}
          onReject={submitReject}
          onOutForDelivery={() => void perform('out-for-delivery', () => orderService.markOutForDelivery(orderId), t('orderNotice.outForDelivery'))} 
          onRequestCode={requestCode}
          onDelivered={confirmDelivery}
        />
      </View> : null}
    </Screen>
  );
}

function OrderSummary({ order }: { order: StoreOrder }) {
  const { t, language } = useLanguage();
  return <View style={styles.summaryCard}>
    <View style={styles.summaryTop}><View style={styles.summaryCopy}><Text style={styles.overline}>{t('orderDetails.orderLabel')}</Text><Text numberOfLines={1} style={styles.summaryNumber}>#{order.order?.order_no ?? order.id}</Text></View><StatusBadge status={order.status} large /></View>
    <Text style={styles.summaryDate}>{t('orderDetails.placed', { date: dateText(order.created_at, true, language) })}</Text>
  </View>;
}

function CustomerCard({ order }: { order: StoreOrder }) {
  const { t } = useLanguage();
  const buyer = order.order?.user;
  return <SectionCard title={t('orderDetails.customer')} icon="account-outline">
    <Text style={styles.customerName}>{buyer?.name ?? t('orderDetails.customer')}</Text>
    <DetailLine label={t('orderDetails.email')} value={buyer?.email} />
    <DetailLine label={t('orderDetails.phone')} value={buyer?.phone} />
  </SectionCard>;
}

function ItemsCard({ items }: { items: OrderLine[] }) {
  const { t } = useLanguage();
  return <SectionCard title={t('orderDetails.items', { count: items.length })} icon="package-variant-closed">
    {items.map((item, index) => <View key={item.id} style={[styles.itemRow, index > 0 && styles.itemDivider]}>
      {item.product_images?.[0] ? <Image source={{ uri: item.product_images[0] }} style={styles.itemImage} /> : <View style={styles.itemImage}><MaterialCommunityIcons name="glasses" size={24} color="#3E6B91" /></View>}
      <View style={styles.itemCopy}>
        <View style={styles.itemTop}><Text style={styles.itemName}>{item.product_name}</Text><Text style={styles.itemTotal}>{currency(item.line_total)}</Text></View>
        {item.product_sku ? <Text style={styles.itemSku}>SKU · {item.product_sku}</Text> : null}
        <Text style={styles.itemMeta}>{currency(item.price)} × {item.quantity}</Text>
        <OrderSelections item={item} />
      </View>
    </View>)}
  </SectionCard>;
}

function OrderSelections({ item }: { item: OrderLine }) {
  const { t } = useLanguage();
  const rows = useMemo(() => {
    const values: [string, unknown][] = [
      [t('selection.lensType'), item.lens_type], [t('selection.lensIndex'), item.lens_index], [t('selection.frameSize'), item.frame_size_id && `#${item.frame_size_id}`],
      [t('selection.lensColour'), item.lens_color_id && t('selection.optionNumber', { id: item.lens_color_id })], [t('selection.lensThickness'), item.lens_thickness_material_id || item.lens_thickness_option_id ? t('selection.materialAndOption', { material: item.lens_thickness_material_id ?? '—', option: item.lens_thickness_option_id ?? '—' }) : null],
      [t('selection.treatments'), item.treatment_ids?.join(', ')], [t('selection.lensCoatings'), item.lens_coatings], [t('selection.progressive'), item.progressive_variant_id && `#${item.progressive_variant_id}`],
      [t('selection.photochromic'), item.photochromic_color_id && `#${item.photochromic_color_id}`], [t('selection.sunColour'), item.prescription_sun_color_id && `#${item.prescription_sun_color_id}`],
      [t('selection.productVariant'), item.product_variant], [t('selection.lensOptions'), item.lens_configuration], [t('selection.prescription'), item.prescription_data],
    ];
    const contact = [
      [t('selection.leftLens'), contactEye(item.contact_lens_left_base_curve, item.contact_lens_left_diameter, item.contact_lens_left_power, item.contact_lens_left_qty, item.contact_lens_left_cylinder, item.contact_lens_left_axis)],
      [t('selection.rightLens'), contactEye(item.contact_lens_right_base_curve, item.contact_lens_right_diameter, item.contact_lens_right_power, item.contact_lens_right_qty, item.contact_lens_right_cylinder, item.contact_lens_right_axis)],
      [t('selection.packSize'), item.contact_lens_pack_quantity && t('selection.lensesPerBox', { count: item.contact_lens_pack_quantity })],
    ] as [string, unknown][];
    return [...values, ...contact].filter(([, value]) => valueText(value));
  }, [item, t]);
  if (!rows.length) return null;
  return <View style={styles.selections}>{rows.map(([label, value]) => <DetailLine key={label} label={label} value={valueText(value) ?? undefined} compact />)}</View>;
}

function contactEye(baseCurve: CurrencyValue, diameter: CurrencyValue, power: CurrencyValue, quantity: number | null | undefined, cylinder: CurrencyValue, axis: CurrencyValue) {
  if ([baseCurve, diameter, power, quantity, cylinder, axis].every((value) => value === null || value === undefined || value === '')) return null;
  return `BC ${baseCurve ?? '—'} · Ø ${diameter ?? '—'} · PWR ${power ?? '—'}${quantity ? ` · ×${quantity}` : ''}${cylinder !== null && cylinder !== undefined ? ` · CYL ${cylinder}` : ''}${axis !== null && axis !== undefined ? ` · AXIS ${axis}` : ''}`;
}

function DeliveryCard({ order }: { order: StoreOrder }) {
  const { t, language } = useLanguage();
  const address = order.delivery_address_snapshot;
  const standardAddress = ['full_name', 'phone', 'address_line_1', 'address_line_2', 'postal_code', 'city', 'state', 'country'];
  const addressRows = address ? Object.entries(address).filter(([key, value]) => !standardAddress.includes(key) && valueText(value)) : [];
  return <SectionCard title={t('orderDelivery.title')} icon="truck-outline">
    <Text style={styles.subsectionTitle}>{t('orderDelivery.address')}</Text>
    {address ? <View style={styles.addressBlock}>
      {standardAddress.map((key) => valueText(address[key]) ? <Text key={key} style={key === 'full_name' ? styles.addressName : styles.addressText}>{valueText(address[key])}</Text> : null)}
      {addressRows.map(([key, value]) => <DetailLine key={key} label={humanize(key)} value={valueText(value) ?? undefined} compact />)}
    </View> : <Text style={styles.emptyCopy}>{t('orderDelivery.addressUnavailable')}</Text>}
    <View style={styles.infoDivider} />
    <DetailLine label={t('orderDelivery.method')} value={order.delivery_method ? humanize(order.delivery_method) : undefined} />
    <DetailLine label={t('orderDelivery.estimated')} value={order.estimated_delivery_date ? dateText(order.estimated_delivery_date, false, language) : undefined} />
    <DetailLine label={t('orderDelivery.fee')} value={order.status === 'pending' ? t('orderDelivery.feeToQuote') : currency(order.delivery_fee)} />
    <DetailLine label={t('orderDelivery.notes')} value={order.delivery_notes} />
    <DetailLine label={t('orderDelivery.verification')} value={order.delivery_verified_at ? t('orderDelivery.confirmedOn', { date: dateText(order.delivery_verified_at, true, language) }) : t('orderDelivery.notConfirmed')} />
    {order.delivery_code_expires_at ? <DetailLine label={t('orderDelivery.codeExpiry')} value={dateText(order.delivery_code_expires_at, true, language)} /> : null}
  </SectionCard>;
}

function PaymentCard({ order }: { order: StoreOrder }) {
  const { t } = useLanguage();
  return <SectionCard title={t('orderPayment.title')} icon="credit-card-outline">
    <DetailLine label={t('orderPayment.status')} value={order.payment_status ? humanize(order.payment_status) : t('orderPayment.pending')} />
    <DetailLine label={t('orderPayment.escrowStatus')} value={order.escrow?.status ? humanize(order.escrow.status) : t('orderPayment.notFunded')} />
    {order.escrow?.amount !== undefined ? <DetailLine label={t('orderPayment.escrowAmount')} value={currency(order.escrow.amount)} /> : null}
    {order.payment?.status ? <DetailLine label={t('orderPayment.provider')} value={[order.payment.provider, humanize(order.payment.status)].filter(Boolean).join(' · ')} /> : null}
    {order.payment?.reference ? <DetailLine label={t('orderPayment.reference')} value={order.payment.reference} /> : null}
    {order.financial_version !== undefined && order.financial_version !== null ? <DetailLine label={t('orderPayment.version')} value={String(order.financial_version)} /> : null}
  </SectionCard>;
}

function PricingCard({ order }: { order: StoreOrder }) {
  const { t } = useLanguage();
  const couponSuffix = order.coupon_code ? ` (${order.coupon_code})` : '';
  return <SectionCard title={t('orderPricing.title')} icon="receipt-text-outline">
    <AmountLine label={t('orderPricing.subtotal')} amount={currency(order.subtotal)} />
    <AmountLine label={t('orderPricing.shipping')} amount={currency(order.delivery_fee)} />
    {Number(order.discount_total ?? 0) > 0 ? <AmountLine label={t('orderPricing.allocatedDiscount')} amount={`−${currency(order.discount_total)}`} positive /> : null}
    {Number(order.coupon_discount ?? 0) > 0 ? <AmountLine label={`${t('orderPricing.coupon')}${couponSuffix}`} amount={`−${currency(order.coupon_discount)}`} positive /> : null}
    {Number(order.coupon_shipping_discount ?? 0) > 0 ? <AmountLine label={`${t('orderPricing.couponShipping')}${couponSuffix}`} amount={`−${currency(order.coupon_shipping_discount)}`} positive /> : null}
    <View style={styles.totalDivider} /><AmountLine label={t('orderPricing.total')} amount={currency(order.total)} strong />
  </SectionCard>;
}

function TimelineCard({ order }: { order: StoreOrder }) {
  const { t, language } = useLanguage();
  const events = [
    ['timeline.placed', order.created_at], ['timeline.accepted', order.accepted_at], ['timeline.paid', order.paid_at], ['timeline.outForDelivery', order.out_for_delivery_at], ['timeline.delivered', order.delivered_at], ['timeline.deliveryConfirmed', order.delivery_verified_at],
  ].filter(([, date]) => Boolean(date)) as [string, string][];
  if (!events.length) return null;
  return <SectionCard title={t('timeline.title')} icon="timeline-outline">{events.map(([label, date], index) => <View key={label} style={styles.timelineRow}><View style={styles.timelineRail}><View style={styles.timelineDot} />{index < events.length - 1 ? <View style={styles.timelineLine} /> : null}</View><View style={styles.timelineCopy}><Text style={styles.timelineTitle}>{t(label)}</Text><Text style={styles.timelineDate}>{dateText(date, true, language)}</Text></View></View>)}</SectionCard>;
}

type OrderActionSheetMode = 'accept' | 'reject' | 'out-for-delivery' | 'request-code' | 'delivery' | null;

type OrderActionsProps = {
  order: StoreOrder;
  busyAction: string | null;
  onForm: (value: OrderActionSheetMode) => void;
};

type OrderActionSheetProps = {
  mode: OrderActionSheetMode;
  busyAction: string | null;
  deliveryFee: string; estimatedDeliveryDate: string; deliveryMethod: string; deliveryNotes: string; rejectionReason: string; deliveryCode: string;
  onClose: () => void;
  onDeliveryFee: (value: string) => void; onEstimatedDate: (value: string) => void; onDeliveryMethod: (value: string) => void; onDeliveryNotes: (value: string) => void; onRejectionReason: (value: string) => void; onDeliveryCode: (value: string) => void;
  onAccept: () => void; onReject: () => void; onOutForDelivery: () => void; onRequestCode: () => void; onDelivered: () => void;
};

function OrderActions(props: OrderActionsProps) {
  const { t } = useLanguage();
  const { order, busyAction } = props;
  if (order.financial_version !== 1) return <InfoCard title={t('orderAction.legacyTitle')} icon="information-outline" tone="info" message={t('orderAction.legacyCopy')} />;
  if (order.status === 'pending') {
    return <View style={styles.actionPair}><AppButton label={t('orderAction.quoteDelivery')} onPress={() => props.onForm('accept')} style={styles.actionHalf} icon={<MaterialCommunityIcons name="truck-fast-outline" size={17} color="#FFFFFF" />} /><AppButton label={t('orderAction.reject')} variant="secondary" onPress={() => props.onForm('reject')} style={styles.actionHalf} icon={<MaterialCommunityIcons name="close-circle-outline" size={17} color={colors.blue} />} /></View>;
  }
  if (order.status === 'paid' || order.status === 'processing') return <AppButton label={busyAction === 'out-for-delivery' ? t('orderAction.updating') : t('orderAction.markOutForDelivery')} disabled={Boolean(busyAction)} onPress={() => props.onForm('out-for-delivery')} icon={<MaterialCommunityIcons name="truck-check-outline" size={18} color="#FFFFFF" />} style={styles.singleAction} />;
  if (order.status === 'out_for_delivery') {
    return <View style={styles.deliveryActions}><AppButton label={busyAction === 'request-code' ? t('orderAction.requestingCode') : t('orderAction.requestCode')} variant="secondary" disabled={Boolean(busyAction)} onPress={() => props.onForm('request-code')} icon={<MaterialCommunityIcons name="message-lock-outline" size={17} color={colors.blue} />} /><AppButton label={t('orderAction.confirmDelivery')} disabled={Boolean(busyAction)} onPress={() => props.onForm('delivery')} icon={<MaterialCommunityIcons name="shield-check-outline" size={18} color="#FFFFFF" />} /></View>;
  }
  return null;
}

function OrderActionSheet(props: OrderActionSheetProps) {
  const { t } = useLanguage();
  const { mode } = props;
  const content = mode === 'accept' ? <><Text style={styles.formHint}>{t('orderSheet.acceptHint')}</Text><Input label={t('orderSheet.deliveryFee')} value={props.deliveryFee} onChangeText={props.onDeliveryFee} keyboardType="decimal-pad" placeholder="0.00" /><DateField label={t('orderSheet.estimatedDate')} value={props.estimatedDeliveryDate} onChange={props.onEstimatedDate} minimumDate={new Date()} /><Input label={t('orderSheet.method')} value={props.deliveryMethod} onChangeText={props.onDeliveryMethod} placeholder={t('orderSheet.methodPlaceholder')} /><Input label={t('orderSheet.notes')} value={props.deliveryNotes} onChangeText={props.onDeliveryNotes} multiline placeholder={t('orderSheet.notesPlaceholder')} /><ActionButtons primary={t('orderSheet.sendQuote')} loading={props.busyAction === 'accept'} onPrimary={props.onAccept} onCancel={props.onClose} /></> : mode === 'reject' ? <><Text style={styles.formHint}>{t('orderSheet.rejectHint')}</Text><Input label={t('orderSheet.reasonLabel')} value={props.rejectionReason} onChangeText={props.onRejectionReason} multiline placeholder={t('orderSheet.reasonPlaceholder')} /><ActionButtons primary={t('orderSheet.rejectOrder')} loading={props.busyAction === 'reject'} destructive onPrimary={props.onReject} onCancel={props.onClose} /></> : mode === 'out-for-delivery' ? <><Text style={styles.formHint}>{t('orderSheet.outHint')}</Text><ActionButtons primary={t('orderAction.markOutForDelivery')} loading={props.busyAction === 'out-for-delivery'} onPrimary={props.onOutForDelivery} onCancel={props.onClose} /></> : mode === 'request-code' ? <><Text style={styles.formHint}>{t('orderSheet.codeHint')}</Text><ActionButtons primary={t('orderAction.requestCode')} loading={props.busyAction === 'request-code'} onPrimary={props.onRequestCode} onCancel={props.onClose} /></> : mode === 'delivery' ? <><Text style={styles.formHint}>{t('orderSheet.deliveryHint')}</Text><Input label={t('orderSheet.codeLabel')} value={props.deliveryCode} onChangeText={(value) => props.onDeliveryCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="000000" maxLength={6} /><ActionButtons primary={t('orderAction.confirmDelivery')} loading={props.busyAction === 'deliver'} onPrimary={props.onDelivered} onCancel={props.onClose} /></> : null;
  const heading = mode === 'accept' ? ['orderSheet.acceptTitle', 'orderSheet.acceptSubtitle'] : mode === 'reject' ? ['orderSheet.rejectTitle', 'orderSheet.rejectSubtitle'] : mode === 'out-for-delivery' ? ['orderSheet.outTitle', 'orderSheet.outSubtitle'] : mode === 'request-code' ? ['orderSheet.codeTitle', 'orderSheet.codeSubtitle'] : ['orderSheet.deliveryTitle', 'orderSheet.deliverySubtitle'];
  return <BottomSheet visible={mode !== null} title={t(heading[0])} subtitle={t(heading[1])} onClose={props.onClose}>{content}</BottomSheet>;
}

function Input({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.inputGroup}><Text style={styles.inputLabel}>{label}</Text><TextInput style={[styles.input, props.multiline && styles.inputMultiline]} placeholderTextColor="#7C8BA0" {...props} /></View>;
}

function ActionButtons({ primary, loading, destructive, onPrimary, onCancel }: { primary: string; loading: boolean; destructive?: boolean; onPrimary: () => void; onCancel: () => void }) {
  const { t } = useLanguage();
  return <View style={styles.actionPair}><Pressable disabled={loading} onPress={onPrimary} style={[styles.manualPrimary, destructive && styles.manualDanger, styles.actionHalf, loading && styles.disabled]}><Text style={styles.manualPrimaryText}>{loading ? t('orderCommon.saving') : primary}</Text></Pressable><AppButton label={t('orderCommon.cancel')} variant="secondary" onPress={onCancel} style={styles.actionHalf} /></View>;
}

function SectionCard({ title, icon, tone, children }: { title: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; tone?: 'danger'; children: React.ReactNode }) {
  return <View style={[styles.sectionCard, tone === 'danger' && styles.dangerCard]}><View style={styles.sectionHeader}><View style={[styles.sectionIcon, tone === 'danger' && styles.dangerIcon]}><MaterialCommunityIcons name={icon} size={18} color={tone === 'danger' ? colors.red : colors.blue} /></View><Text style={[styles.sectionTitle, tone === 'danger' && { color: colors.red }]}>{title}</Text></View>{children}</View>;
}

function DetailLine({ label, value, compact }: { label: string; value?: string | null; compact?: boolean }) {
  if (!value) return null;
  return <View style={[styles.detailLine, compact && styles.detailLineCompact]}><Text style={styles.detailLabel}>{label}</Text><Text selectable style={[styles.detailValue, compact && styles.detailValueCompact]}>{value}</Text></View>;
}

function AmountLine({ label, amount, positive, strong }: { label: string; amount: string; positive?: boolean; strong?: boolean }) {
  return <View style={styles.amountLine}><Text style={[styles.amountLabel, strong && styles.amountStrong]}>{label}</Text><Text style={[styles.amountValue, positive && styles.amountPositive, strong && styles.amountStrong]}>{amount}</Text></View>;
}

function StatusBadge({ status, large }: { status: OrderStatus; large?: boolean }) {
  const { t } = useLanguage();
  const palette = statusStyle[status] ?? { backgroundColor: '#EEF2F6', color: '#526277' };
  const key = STATUS_KEYS[status];
  return <View style={[styles.statusBadge, palette, large && styles.statusBadgeLarge]}><Text style={[styles.statusText, { color: palette.color }, large && styles.statusTextLarge]}>{key ? t(key) : humanize(status)}</Text></View>;
}

function InfoCard({ title, icon, tone, message }: { title: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; tone: 'error' | 'info'; message: string }) {
  const error = tone === 'error';
  return <View style={[styles.infoCard, error && styles.errorInfoCard]}><MaterialCommunityIcons name={icon} size={20} color={error ? colors.red : colors.blue} /><View style={styles.infoCopy}><Text style={[styles.infoTitle, error && { color: colors.red }]}>{title}</Text><Text style={styles.infoMessage}>{message}</Text></View></View>;
}

function InlineAlert({ tone, message }: { tone: 'error' | 'success'; message: string }) {
  const success = tone === 'success';
  return <View style={[styles.inlineAlert, success ? styles.successAlert : styles.errorAlert]}><MaterialCommunityIcons name={success ? 'check-circle-outline' : 'alert-circle-outline'} size={18} color={success ? colors.green : colors.red} /><Text style={[styles.alertText, { color: success ? colors.green : colors.red }]}>{message}</Text></View>;
}

function LoadingState({ label }: { label: string }) { return <View style={styles.state}><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.stateText}>{label}</Text></View>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { const { t } = useLanguage(); return <View style={styles.stateCard}><MaterialCommunityIcons name="cloud-alert-outline" size={27} color={colors.red} /><Text style={styles.stateTitle}>{t('orderState.loadError')}</Text><Text style={styles.stateText}>{message}</Text><AppButton label={t('common.retry')} variant="secondary" onPress={onRetry} style={styles.stateButton} /></View>; }
function EmptyOrders({ filtered }: { filtered: boolean }) { const { t } = useLanguage(); return <View style={styles.stateCard}><MaterialCommunityIcons name="clipboard-text-outline" size={29} color={colors.blue} /><Text style={styles.stateTitle}>{t(filtered ? 'orderState.noMatching' : 'orderState.empty')}</Text><Text style={styles.stateText}>{t(filtered ? 'orderState.noMatchingCopy' : 'orderState.emptyCopy')}</Text></View>; }

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSearch: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, ...shadow.card },
  screenContent: { paddingBottom: 126 }, pageIntro: { paddingHorizontal: 20, paddingTop: 17 }, overline: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' }, pageTitle: { color: colors.ink, fontSize: 25, lineHeight: 30, fontWeight: '800', letterSpacing: -1, marginTop: 4 }, pageSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 }, searchWrap: { minHeight: 48, marginHorizontal: 20, marginTop: 14, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow.card }, searchInput: { flex: 1, color: colors.ink, fontSize: 13, paddingVertical: 11 }, filterBar: { height: 52, marginTop: 14, marginBottom: 8, justifyContent: 'center' }, filterScroller: { flexGrow: 0 }, filterRow: { minHeight: 44, paddingHorizontal: 20, gap: 8, alignItems: 'center' }, filterChip: { height: 36, paddingHorizontal: 13, borderRadius: radius.pill, backgroundColor: '#EDF1F7', borderWidth: 1, borderColor: '#E7EDF5', flexShrink: 0, alignItems: 'center', justifyContent: 'center' }, filterChipActive: { backgroundColor: colors.blue, borderColor: colors.blue }, filterText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, filterTextActive: { color: '#FFFFFF' }, orderList: { paddingHorizontal: 20, gap: 9 }, orderCard: { minHeight: 84, padding: 11, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', ...shadow.card }, orderIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#DDEFFD', alignItems: 'center', justifyContent: 'center' }, orderCopy: { flex: 1, minWidth: 0, marginLeft: 10 }, orderHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 }, orderNumber: { color: colors.ink, fontSize: 13, fontWeight: '800', flexShrink: 1 }, orderBuyer: { color: '#3E5877', fontSize: 12, fontWeight: '700', marginTop: 4 }, orderMeta: { color: colors.subtle, fontSize: 11, marginTop: 3 }, orderEnd: { alignItems: 'flex-end', marginLeft: 8, gap: 5 }, orderAmount: { color: colors.ink, fontSize: 13, fontWeight: '800' }, statusBadge: { maxWidth: '100%', flexShrink: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 }, statusBadgeLarge: { maxWidth: '46%', paddingHorizontal: 10, paddingVertical: 6 }, statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: .3, textAlign: 'center' }, statusTextLarge: { fontSize: 10 }, loadMore: { marginHorizontal: 20, marginTop: 15 }, state: { minHeight: 290, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 12 }, stateCard: { marginHorizontal: 20, minHeight: 210, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 24, ...shadow.card }, stateTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 10, textAlign: 'center' }, stateText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 }, stateButton: { marginTop: 16, minWidth: 130 }, detailBody: { paddingHorizontal: 20, gap: 11, paddingTop: 14 }, summaryCard: { padding: 15, borderRadius: radius.md, backgroundColor: '#EAF3FF', borderWidth: 1, borderColor: '#D9E9FF' }, summaryTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }, summaryCopy: { flex: 1, minWidth: 0 }, summaryNumber: { color: colors.ink, fontSize: 23, letterSpacing: -1, fontWeight: '800', marginTop: 2 }, summaryDate: { color: colors.muted, fontSize: 12, marginTop: 10 }, sectionCard: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card }, dangerCard: { backgroundColor: '#FFF8F8', borderWidth: 1, borderColor: '#F9D7D9' }, sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }, sectionIcon: { height: 31, width: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft }, dangerIcon: { backgroundColor: '#FFF0F1' }, sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' }, customerName: { color: colors.ink, fontSize: 15, fontWeight: '800', marginBottom: 5 }, detailLine: { flexDirection: 'row', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 6 }, detailLineCompact: { paddingTop: 3, gap: 8 }, detailLabel: { color: colors.muted, fontSize: 12, flex: .75 }, detailValue: { color: '#314967', fontSize: 12, fontWeight: '600', lineHeight: 18, textAlign: 'right', flex: 1.25 }, detailValueCompact: { fontSize: 11, lineHeight: 16 }, itemRow: { flexDirection: 'row', paddingVertical: 3 }, itemDivider: { marginTop: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line }, itemImage: { width: 56, height: 56, borderRadius: 13, backgroundColor: '#DDEFFD', alignItems: 'center', justifyContent: 'center' }, itemCopy: { flex: 1, minWidth: 0, marginLeft: 10 }, itemTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' }, itemName: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '800', lineHeight: 18 }, itemTotal: { color: colors.blue, fontSize: 13, fontWeight: '800' }, itemSku: { color: colors.subtle, fontSize: 11, marginTop: 2 }, itemMeta: { color: '#3E5877', fontSize: 11, fontWeight: '700', marginTop: 4 }, selections: { marginTop: 5, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#EDF1F7' }, subsectionTitle: { color: '#3E5877', fontSize: 12, fontWeight: '800', marginBottom: 6 }, addressBlock: { padding: 10, borderRadius: 10, backgroundColor: '#F6F9FD' }, addressName: { color: colors.ink, fontSize: 12, fontWeight: '800', lineHeight: 17 }, addressText: { color: '#4B6079', fontSize: 12, lineHeight: 17 }, emptyCopy: { color: colors.muted, fontSize: 12, lineHeight: 18 }, infoDivider: { height: 1, backgroundColor: colors.line, marginVertical: 10 }, amountLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }, amountLabel: { color: colors.muted, fontSize: 13 }, amountValue: { color: colors.ink, fontSize: 13, fontWeight: '700' }, amountPositive: { color: colors.green }, totalDivider: { height: 1, backgroundColor: colors.line, marginVertical: 7 }, amountStrong: { color: colors.ink, fontSize: 15, fontWeight: '800' }, timelineRow: { flexDirection: 'row', minHeight: 41 }, timelineRail: { width: 24, alignItems: 'center' }, timelineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue, marginTop: 4 }, timelineLine: { width: 2, flex: 1, backgroundColor: '#D5E4F7', marginVertical: 3 }, timelineCopy: { flex: 1, paddingBottom: 10 }, timelineTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, timelineDate: { color: colors.muted, fontSize: 11, marginTop: 2 }, actionPair: { flexDirection: 'row', gap: 9 }, actionHalf: { flex: 1 }, singleAction: { marginTop: 2 }, deliveryActions: { gap: 9 }, formHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 1 }, inputGroup: { marginTop: 12 }, inputLabel: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 6 }, input: { minHeight: 48, borderRadius: 10, backgroundColor: '#F2F6FB', paddingHorizontal: 12, color: colors.ink, fontSize: 14 }, inputMultiline: { minHeight: 84, paddingTop: 12, textAlignVertical: 'top' }, manualPrimary: { minHeight: 48, borderRadius: radius.sm, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, manualDanger: { backgroundColor: colors.red }, manualPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center' }, disabled: { opacity: .55 }, infoCard: { padding: 14, borderRadius: radius.md, flexDirection: 'row', gap: 10, backgroundColor: '#EEF5FF' }, errorInfoCard: { backgroundColor: '#FFF0F1' }, infoCopy: { flex: 1 }, infoTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, infoMessage: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }, inlineAlert: { borderRadius: 11, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, successAlert: { backgroundColor: colors.greenSoft }, errorAlert: { backgroundColor: '#FFF0F1' }, alertText: { fontSize: 12, lineHeight: 17, flex: 1, fontWeight: '700' },
});
