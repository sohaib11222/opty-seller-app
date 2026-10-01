import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppButton } from '../../components/ui/AppButton';
import { AppHeader } from '../../components/ui/AppHeader';
import { Screen } from '../../components/ui/Screen';
import { getErrorMessage } from '../../services/api/client';
import { storeService, type SellerStore } from '../../services/seller/store.service';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { colors, gradients, radius, shadow } from '../../theme/tokens';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

export function StoreScreen() {
  const { t } = useLanguage();
  const [store, setStore] = useState<SellerStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setLoading(true); setError(null); setStore(await storeService.getStore()); } catch (cause) { setError(getErrorMessage(cause)); } finally { setLoading(false); } }, []);
  useAutoRefresh(load);
  return <Screen contentStyle={styles.content}>
    <AppHeader title={t('store.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => router.back()} right={null} />
    {loading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.stateText}>{t('store.loading')}</Text></View> : null}
    {error && !store ? <View style={styles.stateCard}><MaterialCommunityIcons name="cloud-alert-outline" size={27} color={colors.red} /><Text style={styles.stateTitle}>{t('store.loadError')}</Text><Text style={styles.stateText}>{error}</Text><AppButton label={t('common.retry')} variant="secondary" onPress={() => void load()} style={styles.retry} /></View> : null}
    {store ? <View style={styles.body}>
      {error ? <View style={styles.alert}><MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.red} /><Text style={styles.alertText}>{error}</Text></View> : null}
      <StoreHero store={store} />
      <View style={styles.stats}><Stat value={String(store.products_count ?? 0)} label={t('store.products')} /><Stat value={String(store.followers_count ?? 0)} label={t('store.followers')} /><Stat value={store.rating ? String(store.rating) : '—'} label={t('store.rating')} /></View>
      <View style={styles.card}><Text style={styles.cardTitle}>{t('store.workspaceTitle')}</Text><Text style={styles.cardCopy}>{t('store.workspaceCopy')}</Text><View style={styles.links}><NavigationLink icon="pencil-outline" title={t('store.editStore')} copy={t('store.editStoreCopy')} onPress={() => router.push('/edit-store')} /><NavigationLink icon="chart-line" title={t('store.performance')} copy={t('store.performanceCopy')} onPress={() => router.push('/store-performance')} /><NavigationLink icon="cog-outline" title={t('store.settings')} copy={t('store.settingsCopy')} onPress={() => router.push('/settings')} /></View></View>
    </View> : null}
  </Screen>;
}

function StoreHero({ store }: { store: SellerStore }) {
  const { t } = useLanguage();
  const content = <><View style={styles.coverShade} /><View style={styles.coverText}><Text style={styles.overline}>{t('store.yourStore')}</Text><Text numberOfLines={1} style={styles.storeName}>{store.name}</Text><Text style={styles.storeStatus}>{store.status === 'active' ? t('store.activeVisible') : t('store.statusValue', { status: store.status })}</Text></View></>;
  return <View style={styles.heroCard}>{store.banner_image_url ? <ImageBackground source={{ uri: store.banner_image_url }} style={styles.cover} imageStyle={styles.coverImage}>{content}</ImageBackground> : <LinearGradient colors={gradients.storeCover} style={styles.cover}>{content}</LinearGradient>}<View style={styles.storeImage}>{store.profile_image_url ? <Image source={{ uri: store.profile_image_url }} style={styles.image} /> : <MaterialCommunityIcons name="glasses" size={29} color="#0F5CAD" />}</View></View>;
}

function Stat({ value, label }: { value: string; label: string }) { return <View style={styles.stat}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function NavigationLink({ icon, title, copy, onPress }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; copy: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.link}><View style={styles.linkIcon}><MaterialCommunityIcons name={icon} size={20} color={colors.blue} /></View><View style={{ flex: 1 }}><Text style={styles.linkTitle}>{title}</Text><Text style={styles.linkCopy}>{copy}</Text></View><MaterialCommunityIcons name="chevron-right" size={21} color="#91A0B3" /></Pressable>; }

const styles = StyleSheet.create({
  content: { paddingBottom: 126 }, body: { paddingHorizontal: 20, paddingTop: 15, gap: 11 }, heroCard: { borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'visible', ...shadow.card }, cover: { height: 148, overflow: 'hidden', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, justifyContent: 'flex-end' }, coverImage: { borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md }, coverShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,31,65,0.36)' }, coverText: { padding: 16 }, overline: { color: '#D9EDFF', fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' }, storeName: { color: '#FFFFFF', fontSize: 23, letterSpacing: -1, fontWeight: '800', marginTop: 3 }, storeStatus: { color: '#E3F3FF', fontSize: 12, fontWeight: '700', marginTop: 4 }, storeImage: { position: 'absolute', left: 16, bottom: -27, height: 55, width: 55, borderRadius: 18, backgroundColor: '#DFF0FD', borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, image: { width: '100%', height: '100%' }, stats: { paddingTop: 28, flexDirection: 'row', gap: 8 }, stat: { flex: 1, minHeight: 65, padding: 9, backgroundColor: colors.surface, borderRadius: 13, ...shadow.card }, statValue: { color: colors.ink, fontSize: 18, fontWeight: '800' }, statLabel: { color: colors.muted, fontSize: 11, marginTop: 4 }, card: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card }, cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, cardCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, links: { marginTop: 12, gap: 8 }, link: { padding: 11, borderRadius: 12, backgroundColor: '#F6F9FD', flexDirection: 'row', alignItems: 'center', gap: 9 }, linkIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, linkTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, linkCopy: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }, state: { minHeight: 280, justifyContent: 'center', alignItems: 'center', gap: 12 }, stateCard: { marginHorizontal: 20, minHeight: 230, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 24, ...shadow.card }, stateTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 10, textAlign: 'center' }, stateText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4, textAlign: 'center' }, retry: { minWidth: 120, marginTop: 16 }, alert: { padding: 11, borderRadius: 11, backgroundColor: '#FFF0F1', flexDirection: 'row', gap: 8 }, alertText: { flex: 1, color: colors.red, fontSize: 12, lineHeight: 17, fontWeight: '700' },
});
