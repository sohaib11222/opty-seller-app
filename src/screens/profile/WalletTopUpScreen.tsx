import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '../../components/ui/AppButton';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { getErrorMessage } from '../../services/api/client';
import { profileService } from '../../services/profile/profile.service';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { colors } from '../../theme/tokens';

export function WalletTopUpScreen() {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  const load = useCallback(() => profileService.walletCapabilities()
    .then((value) => setAvailable(value.wallet_top_up))
    .catch((cause) => setError(getErrorMessage(cause))), []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    try {
      const value = Number(amount);
      if (!Number.isFinite(value) || value < 5 || value > 100000) {
        throw new Error(t('topUp.error.amount'));
      }
      setBusy(true);
      setError(null);
      await profileService.topUpWallet(amount);
      // Replace rather than go back so the wallet is reloaded with the new
      // balance and the confirmed deposit immediately.
      router.replace('/wallet');
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return <BottomSheet visible title={t('topUp.title')} subtitle={t('topUp.subtitle')} onClose={() => router.back()}>
    {available === null ? <View style={{ minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 12 }}><ActivityIndicator color={colors.blue} /><Text>{t('topUp.checking')}</Text></View> : null}
    {available ? <>
      <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 6 }}>{t('wallet.amount')}</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus placeholder={t('topUp.minimum')} placeholderTextColor="#7C8BA0" style={{ minHeight: 49, borderRadius: 11, paddingHorizontal: 12, backgroundColor: '#FFFFFF', color: colors.ink, fontSize: 14 }} />
      {error ? <Text style={{ color: colors.red, fontSize: 12, marginTop: 10 }}>{error}</Text> : null}
      <AppButton label={busy ? t('topUp.adding') : t('topUp.confirm')} disabled={busy} onPress={() => void submit()} style={{ marginTop: 20 }} />
    </> : null}
    {available === false ? <Text style={{ color: colors.muted, lineHeight: 19 }}>{t('topUp.unavailable')}</Text> : null}
  </BottomSheet>;
}
