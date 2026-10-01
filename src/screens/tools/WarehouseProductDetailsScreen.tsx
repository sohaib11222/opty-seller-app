import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { AppButton } from '../../components/ui/AppButton';
import { AppHeader } from '../../components/ui/AppHeader';
import { Screen } from '../../components/ui/Screen';
import { getErrorMessage } from '../../services/api/client';
import { sellerToolsService, type WarehouseProduct } from '../../services/seller/tools.service';
import { useWarehouseCart } from '../../features/warehouse/WarehouseCartContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { goBack } from '../../navigation/back';
import { colors, radius, shadow } from '../../theme/tokens';
import { useLanguage } from '../../features/i18n/LanguageContext';

const money = (value?: string | number) => '€' + Number(value || 0).toFixed(2);
const readable = (value?: string | null) => (value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const availabilityLabel = (t: (key: string, variables?: Record<string, string | number>) => string, value?: string | null) => {
  const key = 'warehouse.availability.' + (value ?? '');
  return t(key) === key ? readable(value) : t(key);
};

export function WarehouseProductDetailsScreen() {
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = Number(id);
  const { setCart } = useWarehouseCart();
  const [product, setProduct] = useState<WarehouseProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'cart' | 'buy' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(productId) || productId < 1) {
      setError(t('warehouse.unavailable'));
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setProduct(await sellerToolsService.warehouseProduct(productId));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [productId, t]);

  useAutoRefresh(load, true, 15_000, String(productId));
  const safeQuantity = Math.max(1, Math.min(quantity, product?.stock_quantity || 1));

  const add = async (mode: 'cart' | 'buy') => {
    if (!product) return;
    try {
      setBusy(mode);
      setError(null);
      setCart(await sellerToolsService.addWarehouseCartItem(product.id, safeQuantity));
      if (mode === 'buy') router.push('/warehouse-cart');
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  const specs = product ? productSpecs(product, t) : [];
  return <Screen contentStyle={styles.bottom}>
    <AppHeader title={t('warehouse.detailTitle')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => goBack('/warehouse')} right={null} />
    <View style={styles.body}>
      {loading ? <Loading label={t('warehouse.detailLoading')} /> : error && !product ? <Error message={error} /> : product ? <>
        <View style={styles.imagePanel}>{product.image_url ? <Image source={{ uri: product.image_url }} resizeMode="contain" style={styles.image} /> : <MaterialCommunityIcons name="package-variant-closed" size={56} color={colors.blue} />}</View>
        <View style={styles.titleRow}><View style={styles.titleCopy}><Text style={styles.name}>{product.name}</Text><Text style={styles.sku}>{product.sku} · {product.category?.name || t('warehouse.supplyCategoryFallback')}</Text></View><Status value={product.availability} /></View>
        <View style={styles.pricePanel}><View><Text style={styles.priceLabel}>{t('warehouse.unitPrice')}</Text><Text style={styles.price}>{money(product.price)}</Text></View><View style={styles.shipping}><Text style={styles.priceLabel}>{t('warehouse.shipping')}</Text><Text style={styles.shippingValue}>{money(product.shipping_fee)}</Text></View></View>
        <View style={styles.purchasePanel}><View><Text style={styles.quantityLabel}>{t('warehouse.quantity')}</Text><Text style={styles.quantityHint}>{t('warehouse.availableToOrder', { count: product.stock_quantity })}</Text></View><View style={styles.quantityPicker}><QuantityButton icon="minus" disabled={busy !== null || safeQuantity <= 1} onPress={() => setQuantity((value) => Math.max(1, safeQuantity - 1))} /><Text style={styles.quantityValue}>{safeQuantity}</Text><QuantityButton icon="plus" disabled={busy !== null || safeQuantity >= product.stock_quantity} onPress={() => setQuantity((value) => Math.min(product.stock_quantity, safeQuantity + 1))} /></View></View>
        <View style={styles.actions}><AppButton label={busy === 'cart' ? t('warehouse.addingShort') : t('warehouse.addToCartShort')} variant="secondary" disabled={busy !== null || product.stock_quantity < 1} icon={<MaterialCommunityIcons name="cart-plus" size={18} color={colors.blue} />} onPress={() => void add('cart')} style={styles.action} /><AppButton label={busy === 'buy' ? t('warehouse.opening') : t('warehouse.buyNow')} disabled={busy !== null || product.stock_quantity < 1} icon={<MaterialCommunityIcons name="lightning-bolt-outline" size={18} color="#FFFFFF" />} onPress={() => void add('buy')} style={styles.action} /></View>
        {error ? <Error message={error} /> : null}
        <Text style={styles.section}>{t('warehouse.productInformation')}</Text><Text style={styles.description}>{product.description || t('warehouse.readyDescription')}</Text><Detail label={t('warehouse.availability')} value={availabilityLabel(t, product.availability)} /><Detail label={t('warehouse.stockReady')} value={t('warehouse.unitsCount', { count: product.stock_quantity })} /><Detail label={t('warehouse.category')} value={product.category?.name || t('warehouse.supplyCategoryFallback')} />
        {specs.length ? <><Text style={styles.section}>{t('warehouse.specifications')}</Text>{specs.map((item) => <Detail key={item.label} label={item.label} value={item.value} />)}</> : null}
        <Info text={t('warehouse.buyNowInfo')} />
      </> : null}
    </View>
  </Screen>;
}

function productSpecs(product: WarehouseProduct, t: (key: string, variables?: Record<string, string | number>) => string) {
  if (product.category?.type === 'eyeglasses') {
    return [
      product.color ? { label: t('warehouse.specColor'), value: product.color } : null,
      product.temple_size ? { label: t('warehouse.specTemple'), value: product.temple_size } : null,
      product.lens_size ? { label: t('warehouse.specLensSize'), value: product.lens_size } : null,
      product.bridge_size ? { label: t('warehouse.specBridge'), value: product.bridge_size } : null,
    ].filter((item): item is { label: string; value: string } => item !== null);
  }
  return Object.entries(product.details || {}).filter(([, value]) => value !== null && value !== false && value !== '').map(([key, value]) => ({ label: t('warehouse.detail.' + key) === 'warehouse.detail.' + key ? readable(key) : t('warehouse.detail.' + key), value: value === true ? t('warehouse.yes') : String(value) }));
}
function QuantityButton({ icon, disabled, onPress }: { icon: 'minus' | 'plus'; disabled: boolean; onPress: () => void }) { const { t } = useLanguage(); return <Pressable accessibilityLabel={t(icon === 'minus' ? 'warehouse.decreaseA11y' : 'warehouse.increaseA11y')} disabled={disabled} onPress={onPress} style={[styles.quantityButton, disabled && styles.disabled]}><MaterialCommunityIcons name={icon} size={18} color={colors.blue} /></Pressable>; }
function Status({ value }: { value: string }) { const { t } = useLanguage(); return <View style={styles.status}><Text style={styles.statusText}>{availabilityLabel(t, value)}</Text></View>; }
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }
function Info({ text }: { text: string }) { return <View style={styles.info}><MaterialCommunityIcons name="information-outline" size={18} color={colors.blue} /><Text style={styles.infoText}>{text}</Text></View>; }
function Loading({ label }: { label: string }) { return <View style={styles.loading}><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.loadingText}>{label}</Text></View>; }
function Error({ message }: { message: string }) { return <View style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={19} color={colors.red} /><Text style={styles.errorText}>{message}</Text></View>; }

const styles = StyleSheet.create({
  bottom: { paddingBottom: 128 }, body: { padding: 20 }, imagePanel: { width: '100%', height: 205, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#E8F2FF', justifyContent: 'center', alignItems: 'center' }, image: { height: '100%', width: '100%' }, titleRow: { paddingTop: 16, flexDirection: 'row', gap: 10 }, titleCopy: { flex: 1, minWidth: 0 }, name: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -.5 }, sku: { color: colors.subtle, fontSize: 10, marginTop: 4 }, status: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.greenSoft }, statusText: { color: colors.green, fontSize: 9, fontWeight: '800' }, pricePanel: { marginTop: 16, padding: 15, borderRadius: radius.md, backgroundColor: '#F0F6FF', flexDirection: 'row', justifyContent: 'space-between' }, priceLabel: { color: '#718096', fontSize: 9, fontWeight: '800', letterSpacing: .7 }, price: { color: colors.blue, fontSize: 22, fontWeight: '800', marginTop: 4 }, shipping: { alignItems: 'flex-end' }, shippingValue: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 7 }, purchasePanel: { marginTop: 14, padding: 13, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...shadow.card }, quantityLabel: { color: colors.ink, fontSize: 12, fontWeight: '800' }, quantityHint: { color: colors.muted, marginTop: 3, fontSize: 10 }, quantityPicker: { minWidth: 112, height: 42, paddingHorizontal: 5, borderRadius: 13, backgroundColor: '#EAF3FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, quantityButton: { width: 33, height: 33, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }, quantityValue: { color: colors.ink, fontSize: 14, fontWeight: '800', minWidth: 28, textAlign: 'center' }, actions: { flexDirection: 'row', gap: 9, marginTop: 10 }, action: { flex: 1 }, section: { color: '#718096', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 21, marginBottom: 8 }, description: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 10 }, detail: { minHeight: 45, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#E3EAF3', gap: 10 }, detailLabel: { color: colors.muted, fontSize: 11 }, detailValue: { maxWidth: '58%', color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'right' }, info: { marginTop: 14, padding: 11, borderRadius: 11, backgroundColor: '#EAF3FF', flexDirection: 'row', gap: 8 }, infoText: { flex: 1, color: '#285B96', fontSize: 11, lineHeight: 16, fontWeight: '700' }, loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 }, loadingText: { color: colors.muted, fontSize: 12 }, error: { padding: 11, borderRadius: 11, backgroundColor: '#FFF0F1', flexDirection: 'row', gap: 8, marginTop: 12 }, errorText: { flex: 1, color: colors.red, fontSize: 11, lineHeight: 16, fontWeight: '700' }, disabled: { opacity: .45 },
});
