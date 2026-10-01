import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppButton } from '../../components/ui/AppButton';
import { AppHeader } from '../../components/ui/AppHeader';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Screen } from '../../components/ui/Screen';
import { getErrorMessage } from '../../services/api/client';
import { profileService, type SellerWallet, type SellerWithdrawal, type WalletEntry } from '../../services/profile/profile.service';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { getActiveLanguage } from '../../features/i18n/translate';
import type { Language } from '../../features/i18n/dictionaries/core';
import { colors, radius, shadow } from '../../theme/tokens';

type WalletTab = 'transactions' | 'withdrawals' | 'deposits';

const euro = (value?: string | number | null) => new Intl.NumberFormat(getActiveLanguage() === 'it' ? 'it-IT' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
const readable = (value?: string | null) => (value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateTime = (value?: string | null, locale: Language = getActiveLanguage()) => value ? new Date(value).toLocaleString(locale === 'it' ? 'it-IT' : 'en-IE', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export function WalletScreen() {
  const { t, language } = useLanguage();
  const [wallet, setWallet] = useState<SellerWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<SellerWithdrawal[]>([]);
  const [tab, setTab] = useState<WalletTab>('transactions');
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await Promise.all([profileService.wallet(), profileService.walletTransactions(), profileService.withdrawals()]);
      setWallet(result[0]);
      setTransactions(result[1]);
      setWithdrawals(result[2]);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useAutoRefresh(load, true, 15_000);

  const requestPayout = async () => {
    try {
      const value = Number(amount);
      if (!Number.isFinite(value) || value < 10 || !accountName.trim() || !accountNumber.trim() || !bankName.trim()) {
        throw new Error(t('wallet.error.amount'));
      }
      setSubmitting(true);
      await profileService.requestWithdrawal({ amount, accountName: accountName.trim(), accountNumber: accountNumber.trim(), bankName: bankName.trim() });
      setWithdrawalOpen(false);
      setAmount('');
      setAccountName('');
      setAccountNumber('');
      setBankName('');
      await load();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const deposits = transactions.filter((entry) => entry.type === 'seller_wallet_top_up');
  return <Screen contentStyle={styles.screen}>
    <AppHeader title={t('wallet.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => router.back()} right={null} actionLabel={t('wallet.topUp')} actionHref="/wallet-top-up" />
    <View style={styles.body}>
      {error ? <View style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.red} /><Text style={styles.errorText}>{error}</Text></View> : null}
      {loading && !wallet ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.loadingText}>{t('wallet.loading')}</Text></View> : null}
      {wallet ? <>
        <LinearGradient colors={['#053B83', '#0967CB']} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('wallet.available')}</Text>
          <Text style={styles.balance}>{euro(wallet.available_balance)}</Text>
          <View style={styles.balanceMeta}><Text style={styles.balanceMetaText}>{t('wallet.pending')} {euro(wallet.pending_balance)}</Text><View style={styles.dot} /><Text style={styles.balanceMetaText}>{t('wallet.reserved')} {euro(wallet.reserved_balance)}</Text></View>
        </LinearGradient>
        <View style={styles.primaryActions}>
          <AppButton label={t('wallet.topUp')} onPress={() => router.push('/wallet-top-up')} icon={<MaterialCommunityIcons name="plus-circle-outline" size={18} color="#FFFFFF" />} style={styles.primaryAction} />
          <AppButton label={t('wallet.requestPayout')} variant="secondary" onPress={() => setWithdrawalOpen(true)} icon={<MaterialCommunityIcons name="bank-transfer-out" size={18} color={colors.blue} />} style={styles.primaryAction} />
        </View>
        <View style={styles.summary}>
          <Summary label={t('wallet.totalEarnings')} value={euro(wallet.total_earnings)} icon="chart-line" />
          <Summary label={t('wallet.lockedEscrow')} value={euro(wallet.locked_escrow_amount)} icon="lock-outline" />
        </View>
        <View style={styles.tabs}>
          <WalletTabButton label={t('wallet.tabTransactions')} icon="swap-horizontal" active={tab === 'transactions'} onPress={() => setTab('transactions')} />
          <WalletTabButton label={t('wallet.tabWithdrawals')} icon="bank-transfer-out" active={tab === 'withdrawals'} onPress={() => setTab('withdrawals')} />
          <WalletTabButton label={t('wallet.tabDeposits')} icon="plus-circle-outline" active={tab === 'deposits'} onPress={() => setTab('deposits')} />
        </View>
        {tab === 'transactions' ? <TransactionList entries={transactions} language={language} emptyTitle={t('wallet.noTransactions')} emptyCopy={t('wallet.noTransactionsCopy')} /> : null}
        {tab === 'deposits' ? <TransactionList entries={deposits} language={language} emptyTitle={t('wallet.noDeposits')} emptyCopy={t('wallet.noDepositsCopy')} /> : null}
        {tab === 'withdrawals' ? <WithdrawalList items={withdrawals} language={language} /> : null}
      </> : null}
    </View>
    <BottomSheet visible={withdrawalOpen} title={t('wallet.sheetTitle')} subtitle={t('wallet.sheetSubtitle')} onClose={() => setWithdrawalOpen(false)}>
      <Input label={t('wallet.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={t('wallet.minimum')} />
      <Input label={t('wallet.accountHolder')} value={accountName} onChangeText={setAccountName} placeholder={t('wallet.accountHolderPlaceholder')} />
      <Input label={t('wallet.accountNumber')} value={accountNumber} onChangeText={setAccountNumber} autoCapitalize="characters" placeholder={t('wallet.accountNumberPlaceholder')} />
      <Input label={t('wallet.bankName')} value={bankName} onChangeText={setBankName} placeholder={t('wallet.bankPlaceholder')} />
      <AppButton label={submitting ? t('wallet.requesting') : t('wallet.requestPayout')} disabled={submitting} onPress={() => void requestPayout()} style={styles.sheetButton} />
    </BottomSheet>
  </Screen>;
}

function WalletTabButton({ label, icon, active, onPress }: { label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}><MaterialCommunityIcons name={icon} size={16} color={active ? '#FFFFFF' : colors.muted} /><Text numberOfLines={1} style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>;
}

function Summary({ label, value, icon }: { label: string; value: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) {
  return <View style={styles.summaryItem}><View style={styles.summaryIcon}><MaterialCommunityIcons name={icon} size={18} color={colors.blue} /></View><View style={styles.summaryCopy}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View></View>;
}

function TransactionList({ entries, emptyTitle, emptyCopy, language }: { entries: WalletEntry[]; emptyTitle: string; emptyCopy: string; language: Language }) {
  return <View style={styles.list}>{entries.length ? entries.map((entry) => <View key={entry.id} style={styles.row}><View style={styles.rowIcon}><MaterialCommunityIcons name={entry.type === 'seller_wallet_top_up' ? 'plus' : 'swap-horizontal'} size={20} color={colors.blue} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{entry.description || readable(entry.type)}</Text><Text style={styles.rowMeta}>{readable(entry.status)} · {dateTime(entry.created_at, language)}</Text></View><Text style={[styles.amount, Number(entry.amount) < 0 && styles.negativeAmount]}>{Number(entry.amount) > 0 ? '+' : ''}{euro(entry.amount)}</Text></View>) : <Empty title={emptyTitle} copy={emptyCopy} />}</View>;
}

function WithdrawalList({ items, language }: { items: SellerWithdrawal[]; language: Language }) {
  const { t } = useLanguage();
  return <View style={styles.list}>{items.length ? items.map((item) => <View key={item.id} style={styles.row}><View style={styles.rowIcon}><MaterialCommunityIcons name="bank-transfer-out" size={20} color={colors.blue} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{t('wallet.requestNumber', { id: item.id })}</Text><Text style={styles.rowMeta}>{readable(item.status)} · {dateTime(item.created_at, language)}</Text>{item.payout_reference ? <Text style={styles.reference}>{item.payout_reference}</Text> : null}</View><Text style={styles.amount}>{euro(item.amount)}</Text></View>) : <Empty title={t('wallet.noPayouts')} copy={t('wallet.noPayoutsCopy')} />}</View>;
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return <View style={styles.empty}><MaterialCommunityIcons name="wallet-outline" size={30} color={colors.blue} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyCopy}>{copy}</Text></View>;
}

function Input({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.inputGroup}><Text style={styles.inputLabel}>{label}</Text><TextInput style={styles.input} placeholderTextColor="#7C8BA0" {...props} /></View>;
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 122 },
  body: { padding: 20 },
  loading: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontSize: 13 },
  error: { padding: 11, borderRadius: 11, backgroundColor: '#FFF0F1', flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 12 },
  errorText: { color: colors.red, fontSize: 12, flex: 1 },
  balanceCard: { borderRadius: radius.lg, padding: 20, overflow: 'hidden' },
  balanceLabel: { color: '#CDE7FF', fontWeight: '800', fontSize: 10, letterSpacing: 1.2 },
  balance: { color: '#FFFFFF', fontSize: 31, lineHeight: 39, fontWeight: '800', marginTop: 5, letterSpacing: -1 },
  balanceMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  balanceMetaText: { color: '#DDEEFF', fontSize: 11, fontWeight: '600' },
  dot: { height: 4, width: 4, borderRadius: 4, backgroundColor: '#9BD5FF' },
  primaryActions: { flexDirection: 'row', gap: 9, marginTop: 12 },
  primaryAction: { flex: 1 },
  summary: { flexDirection: 'row', gap: 9, marginTop: 13 },
  summaryItem: { flex: 1, minHeight: 72, padding: 11, borderRadius: 13, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow.card },
  summaryIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3FF' },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryLabel: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 3 },
  tabs: { flexDirection: 'row', gap: 5, padding: 4, borderRadius: 13, backgroundColor: '#EAF0F7', marginTop: 19 },
  tab: { flex: 1, minHeight: 38, borderRadius: 9, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabActive: { backgroundColor: colors.blue, ...shadow.card },
  tabText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  tabTextActive: { color: '#FFFFFF' },
  list: { marginTop: 11, gap: 8 },
  row: { minHeight: 70, padding: 11, borderRadius: 13, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow.card },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3FF' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  rowMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  reference: { color: colors.subtle, fontSize: 10, marginTop: 3 },
  amount: { color: colors.green, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  negativeAmount: { color: colors.red },
  empty: { minHeight: 190, paddingHorizontal: 25, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 9 },
  emptyCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  inputGroup: { marginTop: 11 },
  inputLabel: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 6 },
  input: { minHeight: 48, paddingHorizontal: 12, borderRadius: 11, backgroundColor: '#F3F7FC', color: colors.ink, fontSize: 13 },
  sheetButton: { marginTop: 19 },
});
