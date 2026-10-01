import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppButton } from '../../components/ui/AppButton';
import { AppHeader } from '../../components/ui/AppHeader';
import { Screen } from '../../components/ui/Screen';
import { getErrorMessage } from '../../services/api/client';
import { settingsService, type PhoneVisibility, type StoreSettings } from '../../services/seller/settings.service';
import { colors, radius, shadow } from '../../theme/tokens';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useLanguage } from '../../features/i18n/LanguageContext';

const VISIBILITY_OPTIONS: { value: PhoneVisibility; titleKey: string; descriptionKey: string }[] = [
  { value: 'public', titleKey: 'settings.visibilityPublic', descriptionKey: 'settings.visibilityPublicCopy' },
  { value: 'request', titleKey: 'settings.visibilityRequest', descriptionKey: 'settings.visibilityRequestCopy' },
  { value: 'hidden', titleKey: 'settings.visibilityHidden', descriptionKey: 'settings.visibilityHiddenCopy' },
];

const STATUS_KEYS: Record<string, string> = {
  active: 'settings.statusActive', inactive: 'settings.statusInactive', pending: 'settings.statusPending',
  paused: 'settings.statusPaused', suspended: 'settings.statusSuspended', review: 'settings.statusReview',
  draft: 'settings.statusDraft', rejected: 'settings.statusRejected', approved: 'settings.statusApproved',
};

export function SettingsScreen() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [visibility, setVisibility] = useState<PhoneVisibility>('request');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const next = await settingsService.getSettings();
      setSettings(next); setVisibility(next.phone_visibility);
    } catch (cause) { setError(getErrorMessage(cause)); }
    finally { setLoading(false); }
  }, []);

  useAutoRefresh(load);

  const save = async () => {
    try {
      setSaving(true); setError(null); setNotice(null);
      await settingsService.updateSettings({ phone_visibility: visibility });
      setSettings((current) => current ? { ...current, phone_visibility: visibility } : current);
      setNotice(t('settings.savedNotice'));
    } catch (cause) { setError(getErrorMessage(cause)); }
    finally { setSaving(false); }
  };

  const toggleStore = async () => {
    if (!settings) return;
    try {
      setSaving(true); setError(null); setNotice(null);
      const isActive = !settings.is_active;
      await settingsService.updateSettings({ is_active: isActive });
      setSettings({ ...settings, is_active: isActive });
      setNotice(t(isActive ? 'settings.activeNotice' : 'settings.pausedNotice'));
    } catch (cause) { setError(getErrorMessage(cause)); }
    finally { setSaving(false); }
  };

  return <Screen contentStyle={styles.content}>
    <AppHeader title={t('settings.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => router.back()} />
    <View style={styles.hero}><Text style={styles.overline}>{t('settings.overline')}</Text><Text style={styles.title}>{t('settings.pageTitle')}</Text><Text style={styles.subtitle}>{t('settings.pageSubtitle')}</Text></View>
    {loading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.stateText}>{t('settings.loading')}</Text></View> : null}
    {error && !settings ? <View style={styles.stateCard}><MaterialCommunityIcons name="cloud-alert-outline" size={28} color={colors.red} /><Text style={styles.stateTitle}>{t('settings.loadErrorTitle')}</Text><Text style={styles.stateText}>{error}</Text><AppButton label={t('common.retry')} variant="secondary" onPress={() => void load()} style={styles.retry} /></View> : null}
    {settings ? <View style={styles.body}>
      {error ? <Alert tone="error" message={error} /> : null}
      {notice ? <Alert tone="success" message={notice} /> : null}
      <View style={styles.card}>
        <View style={styles.cardHeading}><View style={styles.icon}><MaterialCommunityIcons name="storefront-outline" size={19} color={colors.blue} /></View><View><Text style={styles.cardTitle}>{t('settings.availability')}</Text><Text style={styles.cardCopy}>{t('settings.statusLabel', { status: t(STATUS_KEYS[settings.status] ?? 'settings.statusUnknown') })}</Text></View></View>
        <Pressable disabled={saving} onPress={() => void toggleStore()} style={[styles.availability, settings.is_active && styles.availabilityActive, saving && styles.disabled]}><View style={[styles.availabilityDot, settings.is_active && styles.availabilityDotActive]} /><View style={styles.availabilityCopy}><Text style={styles.availabilityTitle}>{t(settings.is_active ? 'settings.storeActive' : 'settings.storePaused')}</Text><Text style={styles.availabilityText}>{t(settings.is_active ? 'settings.storeActiveCopy' : 'settings.storePausedCopy')}</Text></View><MaterialCommunityIcons name={settings.is_active ? 'toggle-switch' : 'toggle-switch-off-outline'} size={31} color={settings.is_active ? colors.green : '#91A0B3'} /></Pressable>
      </View>
      <View style={styles.card}>
        <View style={styles.cardHeading}><View style={styles.icon}><MaterialCommunityIcons name="phone-outline" size={19} color={colors.blue} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{t('settings.phoneVisibility')}</Text><Text style={styles.cardCopy}>{t('settings.phoneVisibilityCopy')}</Text></View></View>
        <View style={styles.options}>{VISIBILITY_OPTIONS.map((option) => { const selected = visibility === option.value; return <Pressable key={option.value} onPress={() => setVisibility(option.value)} style={[styles.option, selected && styles.optionSelected]}><View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View><View style={{ flex: 1 }}><Text style={styles.optionTitle}>{t(option.titleKey)}</Text><Text style={styles.optionCopy}>{t(option.descriptionKey)}</Text></View></Pressable>; })}</View>
        <Text style={styles.helper}>{t('settings.helper')}</Text><AppButton label={saving ? t('settings.saving') : t('settings.save')} disabled={saving} onPress={() => void save()} style={styles.saveButton} />
      </View>
    </View> : null}
  </Screen>;
}

function Alert({ tone, message }: { tone: 'error' | 'success'; message: string }) { const success = tone === 'success'; return <View style={[styles.alert, success ? styles.successAlert : styles.errorAlert]}><MaterialCommunityIcons name={success ? 'check-circle-outline' : 'alert-circle-outline'} size={18} color={success ? colors.green : colors.red} /><Text style={[styles.alertText, { color: success ? colors.green : colors.red }]}>{message}</Text></View>; }

const styles = StyleSheet.create({
  content: { paddingBottom: 126 }, hero: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 15 }, overline: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' }, title: { color: colors.ink, fontSize: 25, lineHeight: 30, letterSpacing: -1, fontWeight: '800', marginTop: 4 }, subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5 }, body: { paddingHorizontal: 20, gap: 11 }, card: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card }, cardHeading: { flexDirection: 'row', gap: 9, alignItems: 'center', marginBottom: 12 }, icon: { width: 35, height: 35, borderRadius: 11, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, cardTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' }, cardCopy: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }, availability: { padding: 11, borderRadius: 11, backgroundColor: '#F5F7FB', flexDirection: 'row', alignItems: 'center', gap: 9 }, availabilityActive: { backgroundColor: '#EDF9F3' }, availabilityDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#91A0B3', alignSelf: 'flex-start', marginTop: 5 }, availabilityDotActive: { backgroundColor: colors.green }, availabilityCopy: { flex: 1 }, availabilityTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, availabilityText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }, options: { gap: 8 }, option: { padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E9F2', flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, optionSelected: { borderColor: colors.blue, backgroundColor: '#F1F6FF' }, radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#B4C1D0', alignItems: 'center', justifyContent: 'center', marginTop: 1 }, radioSelected: { borderColor: colors.blue }, radioDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: colors.blue }, optionTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, optionCopy: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 }, helper: { color: colors.subtle, fontSize: 11, lineHeight: 16, marginTop: 12 }, saveButton: { marginTop: 12 }, alert: { padding: 11, borderRadius: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, successAlert: { backgroundColor: colors.greenSoft }, errorAlert: { backgroundColor: '#FFF0F1' }, alertText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 17 }, state: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 12 }, stateCard: { marginHorizontal: 20, minHeight: 230, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 24, ...shadow.card }, stateTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 10 }, stateText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 }, retry: { marginTop: 16, minWidth: 120 }, disabled: { opacity: .55 },
});
