import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppButton } from '../../components/ui/AppButton';
import { AppHeader } from '../../components/ui/AppHeader';
import { Screen } from '../../components/ui/Screen';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { getErrorMessage } from '../../services/api/client';
import { getDashboardSnapshot, formatEuro } from '../../services/dashboard/dashboard.service';
import { profileService, type MarketplaceNotification, type SellerProfile, type SellerReview, type SellerSupportTicket, type SellerWallet, type SellerWithdrawal, type StoreFollower, type SupportTicketCategory, type SupportTicketPriority, type SupportTicketStatus, type WalletEntry, type WarehouseOrder } from '../../services/profile/profile.service';
import type { DashboardSnapshot } from '../../types/seller';
import { colors, gradients, radius, shadow } from '../../theme/tokens';
import { useAuth } from '../../features/auth/AuthContext';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { getActiveLanguage } from '../../features/i18n/translate';
import { apiLabel } from '../../features/i18n/apiLabels';
import type { Language } from '../../features/i18n/dictionaries/core';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { pickChatAttachment } from '../../services/api/attachment';
import { useSellerBadges } from '../../features/notifications/SellerBadgeContext';

const relativeTime = (value?: string | null, locale: Language = getActiveLanguage()) => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-IE', { dateStyle: 'medium' }); };

export function ProfileHubScreen() {
  const { t } = useLanguage();
  const { session, signOut } = useAuth(); const { summary } = useSellerBadges(); const [profile, setProfile] = useState<SellerProfile | null>(null); const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setError(null); const [nextProfile, nextDashboard] = await Promise.all([profileService.get(), getDashboardSnapshot()]); setProfile(nextProfile); setDashboard(nextDashboard); } catch (cause) { setError(getErrorMessage(cause)); } }, []);
  useAutoRefresh(load, true, 15_000);
  const leave = () => Alert.alert(t('profile.signOutTitle'), t('profile.signOutCopy'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('profile.signOut'), style: 'destructive', onPress: () => void signOut().then(() => router.replace('/sign-in')) }]);
  const name = profile?.name || session?.user.name || t('profile.sellerFallback'); const image = dashboard?.store.profile_image_url || profile?.profile_image_url || session?.user.profile_image_url;
  return <Screen contentStyle={styles.bottom}><AppHeader title={t('profile.title')} right={<MaterialCommunityIcons name="cog-outline" size={21} color="#3E5877" />} withMainActions rightA11yLabel={t('nav.sellerSettings')} onRightPress={() => router.push('/settings')} /><View style={styles.profileBody}>{error ? <InlineError message={error} /> : null}<LinearGradient colors={gradients.auth} style={styles.hero}><View style={styles.heroTop}>{image ? <Image source={{ uri: image }} style={styles.heroAvatar} /> : <View style={styles.heroAvatar}><Text style={styles.heroInitial}>{name.charAt(0).toUpperCase()}</Text></View>}<View style={styles.heroCopy}><Text numberOfLines={1} style={styles.heroName}>{name}</Text><Text numberOfLines={1} style={styles.heroEmail}>{profile?.email || session?.user.email}</Text><Pressable onPress={() => router.push('/account')} style={styles.editProfile}><MaterialCommunityIcons name="pencil-outline" size={13} color="#FFFFFF" /><Text style={styles.editProfileText}>{t('profile.editAccount')}</Text></Pressable></View></View><View style={styles.heroStats}><HeroStat label={t('profile.products')} value={String(dashboard?.totalProducts ?? '—')} /><HeroStat label={t('profile.orders')} value={String(dashboard?.totalOrders ?? '—')} /><HeroStat label={t('profile.followers')} value={String(dashboard?.store.followers_count ?? dashboard?.monthlyFollowers ?? '—')} /></View></LinearGradient><Text style={styles.sectionLabel}>{t('profile.manageBusiness')}</Text><MenuCard items={[{ icon: 'storefront-outline', title: t('profile.storeProfile'), copy: t('profile.storeProfileCopy'), onPress: () => router.push('/store') }, { icon: 'wallet-outline', title: t('profile.walletPayouts'), copy: t('profile.walletPayoutsCopy'), onPress: () => router.push('/wallet') }, { icon: 'chart-line', title: t('profile.performance'), copy: t('profile.performanceCopy'), onPress: () => router.push('/store-performance') }, { icon: 'tune-variant', title: t('profile.configuration'), copy: t('profile.configurationCopy'), onPress: () => router.push('/configuration') }, { icon: 'package-variant-closed', title: t('nav.products'), copy: t('profile.productsCopy'), onPress: () => router.push('/products') }, { icon: 'clipboard-text-outline', title: t('nav.orders'), copy: t('profile.ordersCopy'), badge: summary.orders, onPress: () => router.push('/orders') }]} /><Text style={styles.sectionLabel}>{t('profile.customersSupport')}</Text><MenuCard items={[{ icon: 'account-group-outline', title: t('nav.messages'), copy: t('profile.messagesCopy'), badge: summary.messages, onPress: () => router.push('/messages') }, { icon: 'account-heart-outline', title: t('store.followers'), copy: t('profile.followersCopy'), onPress: () => router.push('/followers') }, { icon: 'star-outline', title: t('profile.reviews'), copy: t('profile.reviewsCopy'), onPress: () => router.push('/reviews') }, { icon: 'bell-outline', title: t('profile.notifications'), copy: t('profile.notificationsCopy'), badge: summary.notifications, onPress: () => router.push('/notifications') }, { icon: 'lifebuoy', title: t('profile.supportTickets'), copy: t('profile.supportTicketsCopy'), badge: summary.support, onPress: () => router.push('/support') }, { icon: 'help-circle-outline', title: t('profile.faqs'), copy: t('profile.faqsCopy'), onPress: () => router.push('/faqs') }]} /><Text style={styles.sectionLabel}>{t('profile.accountSecurity')}</Text><MenuCard items={[{ icon: 'account-edit-outline', title: t('profile.personalDetails'), copy: t('profile.personalDetailsCopy'), onPress: () => router.push('/account') }, { icon: 'lock-outline', title: t('profile.passwordSecurity'), copy: t('profile.passwordSecurityCopy'), onPress: () => router.push({ pathname: '/account', params: { section: 'security' } }) }, { icon: 'cog-outline', title: t('profile.sellerSettings'), copy: t('profile.sellerSettingsCopy'), onPress: () => router.push('/settings') }]} /><AppButton label={t('profile.signOut')} variant="text" onPress={leave} icon={<MaterialCommunityIcons name="logout" size={18} color={colors.blue} />} style={styles.signOut} /></View></Screen>;
}

function HeroStat({ label, value }: { label: string; value: string }) { return <View style={styles.heroStat}><Text style={styles.heroStatValue}>{value}</Text><Text style={styles.heroStatLabel}>{label}</Text></View>; }
type MenuItem = { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; copy: string; badge?: number; onPress: () => void };
function MenuCard({ items }: { items: MenuItem[] }) { const { t } = useLanguage(); const warehouse: MenuItem = { icon: 'warehouse', title: t('profile.warehouseOrders'), copy: t('profile.warehouseOrdersCopy'), onPress: () => router.push('/warehouse-orders') }; const rows: MenuItem[] = items[0]?.title === t('profile.storeProfile') ? [...items, warehouse] : items; return <View style={styles.menuCard}>{rows.map((item, index) => <Pressable key={item.title} onPress={item.onPress} style={[styles.menuRow, index < rows.length - 1 && styles.menuRowLine]}><View style={styles.menuIcon}><MaterialCommunityIcons name={item.icon} size={21} color={colors.blue} /></View><View style={styles.menuCopy}><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.menuText}>{item.copy}</Text></View>{item.badge ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{item.badge > 99 ? '99+' : item.badge}</Text></View> : null}<MaterialCommunityIcons name="chevron-right" size={21} color="#8A9AAF" /></Pressable>)}</View>; }

type PasswordChangeStep = 'send' | 'verify' | 'reset';

export function AccountScreen() {
  const { t } = useLanguage();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [passwordStep, setPasswordStep] = useState<PasswordChangeStep>('send');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [security, setSecurity] = useState(section === 'security');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const next = await profileService.get();
      setProfile(next);
      setName(next.name);
      setEmail(next.email);
      setPhone(next.phone ?? '');
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const saveDetails = async () => {
    try {
      if (!name.trim()) throw new Error(t('account.error.enterFullName'));
      setSaving(true);
      const next = await profileService.update({ name: name.trim(), phone: phone.trim() || null });
      setProfile(next);
      setNotice(t('account.detailsSaved'));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const sendPasswordCode = async () => {
    try {
      setError(null);
      setNotice(null);
      setSaving(true);
      const response = await profileService.sendPasswordChangeCode();
      setEmail(response.email || email);
      setPasswordStep('verify');
      setNotice(t('account.codeSent'));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const verifyPasswordCode = async () => {
    try {
      if (!/^\d{6}$/.test(verificationCode.trim())) throw new Error(t('account.error.code'));
      setError(null);
      setNotice(null);
      setSaving(true);
      await profileService.verifyPasswordChangeCode(verificationCode.trim());
      setPasswordStep('reset');
      setNotice(t('account.codeVerified'));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    try {
      if (newPassword.length < 8 || newPassword !== confirmation) throw new Error(t('account.error.passwordRules'));
      setError(null);
      setNotice(null);
      setSaving(true);
      await profileService.resetPasswordWithVerifiedCode(newPassword, confirmation);
      setVerificationCode('');
      setNewPassword('');
      setConfirmation('');
      setPasswordStep('send');
      setNotice(t('account.passwordUpdated'));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t('account.error.allowPhoto'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .82 });
      if (result.canceled) return;
      setSaving(true);
      setProfile(await profileService.uploadImage({
        uri: result.assets[0].uri,
        name: result.assets[0].fileName,
        mimeType: result.assets[0].mimeType,
      }));
      setNotice(t('account.photoUpdated'));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.bottom}>
      <AppHeader title={t('account.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => router.back()} right={null} />
      {loading ? <LoadingAccount label={t('account.loading')} /> : (
        <View style={styles.accountBody}>
          {error ? <InlineError message={error} /> : null}
          {notice ? <Notice text={notice} /> : null}
          <View style={styles.accountToggle}>
            <Pressable onPress={() => setSecurity(false)} style={[styles.accountTab, !security && styles.accountTabActive]}><Text style={[styles.accountTabText, !security && styles.accountTabTextActive]}>{t('account.detailsTab')}</Text></Pressable>
            <Pressable onPress={() => setSecurity(true)} style={[styles.accountTab, security && styles.accountTabActive]}><Text style={[styles.accountTabText, security && styles.accountTabTextActive]}>{t('account.securityTab')}</Text></Pressable>
          </View>

          {security ? (
            <>
              <Text style={styles.formHeading}>{passwordStep === 'reset' ? t('account.resetPasswordHeading') : passwordStep === 'verify' ? t('account.codeHeading') : t('account.passwordHeading')}</Text>
              <Text style={styles.formCopy}>{passwordStep === 'reset' ? t('account.resetPasswordCopy') : passwordStep === 'verify' ? t('account.codeCopy', { email }) : t('account.passwordCopy')}</Text>
              {passwordStep === 'send' ? (
                <>
                  <Field label={t('account.registeredEmail')} value={email} editable={false} selectTextOnFocus={false} keyboardType="email-address" autoCapitalize="none" />
                  <AppButton label={saving ? t('account.sendingCode') : t('account.sendCode')} disabled={saving} onPress={() => void sendPasswordCode()} style={styles.saveButton} />
                </>
              ) : null}
              {passwordStep === 'verify' ? (
                <>
                  <Field label={t('account.code')} value={verificationCode} onChangeText={(value) => setVerificationCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
                  <AppButton label={saving ? t('account.verifyingCode') : t('account.verifyCode')} disabled={saving} onPress={() => void verifyPasswordCode()} style={styles.saveButton} />
                  <AppButton label={t('account.resendCode')} variant="text" disabled={saving} onPress={() => void sendPasswordCode()} style={{ marginTop: 8 }} />
                </>
              ) : null}
              {passwordStep === 'reset' ? (
                <>
                  <Field label={t('account.newPassword')} value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" />
                  <Field label={t('account.confirmNewPassword')} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" />
                  <AppButton label={saving ? t('account.saving') : t('account.updatePassword')} disabled={saving} onPress={() => void changePassword()} style={styles.saveButton} />
                </>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.photoBlock}>
                {profile?.profile_image_url ? <Image source={{ uri: profile.profile_image_url }} style={styles.accountPhoto} /> : <View style={styles.accountPhoto}><Text style={styles.accountPhotoInitial}>{name.charAt(0).toUpperCase()}</Text></View>}
                <View style={{ flex: 1 }}>
                  <Text style={styles.photoTitle}>{t('account.profilePhoto')}</Text>
                  <Text style={styles.photoCopy}>{t('account.profilePhotoCopy')}</Text>
                  <Pressable onPress={() => void pickImage()}><Text style={styles.textAction}>{t('account.updatePhoto')}</Text></Pressable>
                </View>
              </View>
              <Text style={styles.formHeading}>{t('account.personalHeading')}</Text>
              <Field label={t('account.fullName')} value={name} onChangeText={setName} />
              <Field label={t('account.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Field label={t('account.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <AppButton label={saving ? t('account.saving') : t('account.saveDetails')} disabled={saving} onPress={() => void saveDetails()} style={styles.saveButton} />
            </>
          )}
        </View>
      )}
    </Screen>
  );
}

export function WalletScreen() { const { t, language } = useLanguage();
  const [wallet, setWallet] = useState<SellerWallet | null>(null); const [entries, setEntries] = useState<WalletEntry[]>([]); const [withdrawals, setWithdrawals] = useState<SellerWithdrawal[]>([]); const [error, setError] = useState<string | null>(null); const [sheet, setSheet] = useState(false); const [amount, setAmount] = useState(''); const [accountName, setAccountName] = useState(''); const [accountNumber, setAccountNumber] = useState(''); const [bankName, setBankName] = useState(''); const [submitting, setSubmitting] = useState(false);
  const load = useCallback(async () => { try { setError(null); const [nextWallet, nextEntries, nextWithdrawals] = await Promise.all([profileService.wallet(), profileService.walletTransactions(), profileService.withdrawals()]); setWallet(nextWallet); setEntries(nextEntries); setWithdrawals(nextWithdrawals); } catch (cause) { setError(getErrorMessage(cause)); } }, []);
  useAutoRefresh(load, true, 15_000);
  const withdraw = async () => { try { const parsed = Number(amount); if (!Number.isFinite(parsed) || parsed < 10 || !accountName.trim() || !accountNumber.trim() || !bankName.trim()) throw new Error(t('wallet.error.amount')); setSubmitting(true); await profileService.requestWithdrawal({ amount, accountName: accountName.trim(), accountNumber: accountNumber.trim(), bankName: bankName.trim() }); setSheet(false); setAmount(''); setAccountName(''); setAccountNumber(''); setBankName(''); await load(); } catch (cause) { setError(getErrorMessage(cause)); } finally { setSubmitting(false); } };
  return <Screen contentStyle={styles.bottom}><AppHeader title={t('wallet.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => router.back()} right={null} actionLabel={t('wallet.topUp')} actionHref="/wallet-top-up" /><View style={styles.accountBody}>{error ? <InlineError message={error} /> : null}{!wallet ? <LoadingAccount label={t('wallet.loading')} /> : <><LinearGradient colors={gradients.revenue} style={styles.walletHero}><Text style={styles.walletLabel}>{t('wallet.available')}</Text><Text style={styles.walletBalance}>{formatEuro(wallet.available_balance)}</Text><Text style={styles.walletSub}>Pending {formatEuro(wallet.pending_balance)} · Reserved {formatEuro(wallet.reserved_balance)}</Text></LinearGradient><AppButton label={t('wallet.requestPayout')} onPress={() => setSheet(true)} style={styles.saveButton} icon={<MaterialCommunityIcons name="bank-transfer-out" size={18} color="#FFFFFF" />} /><View style={styles.walletStats}><SmallStat label={t('wallet.totalEarnings')} value={formatEuro(wallet.total_earnings)} /><SmallStat label={t('wallet.lockedEscrow')} value={formatEuro(wallet.locked_escrow_amount)} /></View><Text style={styles.sectionLabel}>{t('wallet.recentActivity')}</Text>{entries.length ? entries.map((entry) => <View key={entry.id} style={styles.entry}><View style={styles.entryIcon}><MaterialCommunityIcons name="swap-horizontal" size={19} color={colors.blue} /></View><View style={styles.entryCopy}><Text style={styles.entryTitle}>{entry.description || apiLabel('wallet.type', entry.type)}</Text><Text style={styles.entryMeta}>{apiLabel('wallet.status', entry.status)} · {relativeTime(entry.created_at, language)}</Text></View><Text style={styles.entryAmount}>{formatEuro(entry.amount)}</Text></View>) : <EmptyAccount title={t('wallet.noActivity')} copy={t('wallet.noActivityCopy')} />}<Text style={styles.sectionLabel}>{t('wallet.withdrawalHistory')}</Text>{withdrawals.length ? withdrawals.map((item) => <View key={item.id} style={styles.entry}><View style={styles.entryIcon}><MaterialCommunityIcons name="bank-transfer-out" size={19} color={colors.blue} /></View><View style={styles.entryCopy}><Text style={styles.entryTitle}>{t('wallet.requestNumber', { id: item.id })}</Text><Text style={styles.entryMeta}>{apiLabel('wallet.status', item.status)} · {relativeTime(item.created_at, language)}{item.payout_reference ? ` · ${item.payout_reference}` : ''}</Text>{item.notes ? <Text style={styles.followerMeta}>{item.notes}</Text> : null}</View><Text style={styles.entryAmount}>{formatEuro(item.amount)}</Text></View>) : <EmptyAccount title={t('wallet.noPayouts')} copy={t('wallet.noPayoutsCopy')} />}</>}</View><BottomSheet visible={sheet} title={t('wallet.sheetTitle')} subtitle={t('wallet.sheetSubtitle')} onClose={() => setSheet(false)}><Field label={t('wallet.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={t('wallet.minimum')} /><Field label={t('wallet.accountHolder')} value={accountName} onChangeText={setAccountName} placeholder={t('wallet.accountHolderPlaceholder')} /><Field label={t('wallet.accountNumber')} value={accountNumber} onChangeText={setAccountNumber} autoCapitalize="characters" placeholder={t('wallet.accountNumberPlaceholder')} /><Field label={t('wallet.bankName')} value={bankName} onChangeText={setBankName} placeholder={t('wallet.bankPlaceholder')} /><AppButton label={submitting ? t('wallet.requesting') : t('wallet.requestPayout')} disabled={submitting} onPress={() => void withdraw()} style={styles.saveButton} /></BottomSheet></Screen>;
}

export function ReviewsScreen() { const { t, language } = useLanguage(); const [type, setType] = useState<'store' | 'product'>('store'); const [reviews, setReviews] = useState<SellerReview[]>([]); const [error, setError] = useState<string | null>(null); const load = useCallback(async () => { try { setError(null); setReviews(await profileService.reviews(type)); } catch (cause) { setError(getErrorMessage(cause)); } }, [type]); useAutoRefresh(load, true, 20_000, type); return <Screen contentStyle={styles.bottom}><AppHeader title={t('reviews.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => router.back()} right={null} /><View style={styles.accountBody}><View style={styles.accountToggle}><Pressable onPress={() => setType('store')} style={[styles.accountTab, type === 'store' && styles.accountTabActive]}><Text style={[styles.accountTabText, type === 'store' && styles.accountTabTextActive]}>{t('reviews.storeTab')}</Text></Pressable><Pressable onPress={() => setType('product')} style={[styles.accountTab, type === 'product' && styles.accountTabActive]}><Text style={[styles.accountTabText, type === 'product' && styles.accountTabTextActive]}>{t('reviews.productTab')}</Text></Pressable></View>{error ? <InlineError message={error} /> : null}{reviews.length ? reviews.map((review) => <View key={review.id} style={styles.review}><View style={styles.reviewTop}><Text style={styles.reviewName}>{review.user?.name || 'Customer'}</Text><Text style={styles.reviewStars}>{'★'.repeat(Math.max(0, Math.min(5, Math.round(Number(review.rating ?? 0)))))}</Text></View><Text style={styles.reviewText}>{review.title || review.comment || t('reviews.verifiedPurchase')}</Text><Text style={styles.reviewMeta}>{review.product?.name || review.store?.name || t('reviews.fallbackStore')} · {relativeTime(review.created_at, language)}</Text></View>) : <EmptyAccount title={t('reviews.empty')} copy={t('reviews.emptyCopy')} />}</View></Screen>; }

export function NotificationsScreen() { const { t, language } = useLanguage(); const { refreshBadges } = useSellerBadges(); const [data, setData] = useState<{ notifications: MarketplaceNotification[]; unread_count: number }>({ notifications: [], unread_count: 0 }); const [error, setError] = useState<string | null>(null); const load = useCallback(async () => { try { setError(null); setData(await profileService.notifications()); } catch (cause) { setError(getErrorMessage(cause)); } }, []); useAutoRefresh(load, true, 15_000); const markAll = async () => { try { await profileService.markAllNotificationsRead(); await Promise.all([load(), refreshBadges()]); } catch (cause) { setError(getErrorMessage(cause)); } }; return <Screen contentStyle={styles.bottom}><AppHeader title={t('notifications.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => router.back()} right={data.unread_count ? <MaterialCommunityIcons name="check-all" size={21} color="#3E5877" /> : null} onRightPress={() => void markAll()} /><View style={styles.accountBody}>{error ? <InlineError message={error} /> : null}{data.notifications.length ? data.notifications.map((item) => <Pressable key={item.id} onPress={() => { if (!item.read_at) void profileService.markNotificationRead(item.id).then(async () => { await Promise.all([load(), refreshBadges()]); }); }} style={[styles.notification, !item.read_at && styles.notificationUnread]}><View style={styles.entryIcon}><MaterialCommunityIcons name="bell-outline" size={19} color={colors.blue} /></View><View style={styles.entryCopy}><Text style={styles.entryTitle}>{item.title}</Text><Text style={styles.notificationText}>{item.message}</Text><Text style={styles.entryMeta}>{relativeTime(item.created_at, language)}</Text></View>{!item.read_at ? <View style={styles.unreadDot} /> : null}</Pressable>) : <EmptyAccount title={t('notifications.empty')} copy={t('notifications.emptyCopy')} />}</View></Screen>; }

export function FollowersScreen() { const { t, language } = useLanguage();
  const [followers, setFollowers] = useState<StoreFollower[]>([]); const [total, setTotal] = useState<number | null>(null); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setError(null); const response = await profileService.followers(); setFollowers(response.followers ?? []); setTotal(response.pagination?.total ?? response.followers?.length ?? 0); } catch (cause) { setError(getErrorMessage(cause)); } }, []);
  useAutoRefresh(load, true, 20_000);
  return <Screen contentStyle={styles.bottom}><AppHeader title={t('followers.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => router.back()} right={null} /><View style={styles.accountBody}><View style={styles.followerHero}><MaterialCommunityIcons name="account-heart-outline" size={25} color="#6D3DD0" /><View style={{ flex: 1 }}><Text style={styles.followerHeading}>{t('followers.heading')}</Text><Text style={styles.followerCopy}>{t('followers.copy')}</Text></View><View style={styles.totalPill}><Text style={styles.totalText}>{total ?? '—'}</Text></View></View>{error ? <InlineError message={error} /> : null}{followers.length ? followers.map((follower) => <View key={follower.id} style={styles.followerRow}>{follower.user.profile_image_url ? <Image source={{ uri: follower.user.profile_image_url }} style={styles.followerAvatar} /> : <View style={styles.followerAvatar}><Text style={styles.followerInitial}>{follower.user.name?.charAt(0).toUpperCase() || '?'}</Text></View>}<View style={styles.entryCopy}><Text style={styles.entryTitle}>{follower.user.name}</Text><Text style={styles.entryMeta}>{t('followers.followingSince', { date: relativeTime(follower.followed_at, language) })}</Text><Text style={styles.followerMeta}>{t('followers.memberSince', { date: relativeTime(follower.user.created_at, language) })}</Text></View></View>) : <EmptyAccount title={t('followers.empty')} copy={t('followers.emptyCopy')} />}</View></Screen>;
}

export function WarehouseOrdersScreen() { const { t, language } = useLanguage();
  const [orders, setOrders] = useState<WarehouseOrder[]>([]); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setError(null); setOrders(await profileService.warehouseOrders()); } catch (cause) { setError(getErrorMessage(cause)); } }, []);
  useAutoRefresh(load, true, 20_000);
  return <Screen contentStyle={styles.bottom}><AppHeader title={t('warehouseOrders.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => router.back()} right={null} /><View style={styles.accountBody}><View style={styles.supportIntro}><View style={styles.entryIcon}><MaterialCommunityIcons name="warehouse" size={20} color={colors.blue} /></View><View style={styles.entryCopy}><Text style={styles.entryTitle}>{t('warehouseOrders.heading')}</Text><Text style={styles.notificationText}>{t('warehouseOrders.copy')}</Text></View></View>{error ? <InlineError message={error} /> : null}{orders.length ? orders.map((order) => <View key={order.id} style={styles.ticket}><View style={styles.ticketTop}><View style={{ flex: 1 }}><Text style={styles.ticketNo}>{order.order_number}</Text><Text style={styles.entryTitle}>{t('warehouseOrders.itemsCount', { count: order.items.reduce((sum, item) => sum + item.quantity, 0), status: apiLabel('warehouseOrder.paymentStatus', order.payment_status) })} · {apiLabel('warehouseOrder.paymentStatus', order.payment_status)}</Text></View><View style={styles.statusPill}><Text style={styles.statusText}>{apiLabel('warehouseOrder.status', order.status)}</Text></View></View><Text style={styles.ticketMeta}>{relativeTime(order.created_at, language)} · {order.shipping_carrier || t('warehouseOrders.shippingPending')}{order.tracking_number ? ` · ${order.tracking_number}` : ''}</Text><Text style={[styles.entryAmount, { marginLeft: 0, marginTop: 8 }]}>{formatEuro(order.total)}</Text></View>) : <EmptyAccount title={t('warehouseOrders.empty')} copy={t('warehouseOrders.emptyCopy')} />}</View></Screen>;
}

const SUPPORT_STATUSES: (SupportTicketStatus | '')[] = ['', 'open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'];
const supportCategories: SupportTicketCategory[] = ['seller_store', 'product', 'order', 'payment', 'shipping', 'refund', 'account', 'technical', 'other'];
const supportPriorities: SupportTicketPriority[] = ['low', 'normal', 'high', 'urgent'];
const readable = (value?: string | null) => (value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function SupportScreen() { const { t, language } = useLanguage();
  const { refreshBadges } = useSellerBadges(); const [tickets, setTickets] = useState<SellerSupportTicket[]>([]); const [status, setStatus] = useState<SupportTicketStatus | ''>(''); const [error, setError] = useState<string | null>(null); const [createOpen, setCreateOpen] = useState(false); const [selected, setSelected] = useState<SellerSupportTicket | null>(null); const [subject, setSubject] = useState(''); const [description, setDescription] = useState(''); const [category, setCategory] = useState<SupportTicketCategory>('seller_store'); const [priority, setPriority] = useState<SupportTicketPriority>('normal'); const [reply, setReply] = useState(''); const [attachment, setAttachment] = useState<{ uri: string; name: string; mimeType?: string | null } | null>(null); const [submitting, setSubmitting] = useState(false);
  const load = useCallback(async () => { try { setError(null); setTickets(await profileService.supportTickets({ status })); } catch (cause) { setError(getErrorMessage(cause)); } }, [status]);
  useAutoRefresh(load, true, 10_000, status);
  const choose = async () => { try { const file = await pickChatAttachment(); if (file) setAttachment(file); } catch (cause) { setError(getErrorMessage(cause)); } };
  const open = async (id: number) => { try { setError(null); setSelected(await profileService.supportTicket(id)); setReply(''); setAttachment(null); void refreshBadges().catch(() => undefined); } catch (cause) { setError(getErrorMessage(cause)); } };
  const create = async () => { try { if (!subject.trim() || !description.trim()) throw new Error(t('support.errorSubject')); setSubmitting(true); const ticket = await profileService.createSupportTicket({ subject: subject.trim(), description: description.trim(), category, priority, attachment }); setCreateOpen(false); setSubject(''); setDescription(''); setAttachment(null); await load(); await open(ticket.id); } catch (cause) { setError(getErrorMessage(cause)); } finally { setSubmitting(false); } };
  const sendReply = async () => { if (!selected || (!reply.trim() && !attachment)) return; try { setSubmitting(true); await profileService.replySupportTicket(selected.id, { body: reply.trim(), attachment }); setReply(''); setAttachment(null); await open(selected.id); await load(); } catch (cause) { setError(getErrorMessage(cause)); } finally { setSubmitting(false); } };
  const update = async (reopen: boolean) => { if (!selected) return; try { setSubmitting(true); setSelected(reopen ? await profileService.reopenSupportTicket(selected.id) : await profileService.closeSupportTicket(selected.id)); await load(); } catch (cause) { setError(getErrorMessage(cause)); } finally { setSubmitting(false); } };
  return <Screen contentStyle={styles.bottom}><AppHeader title={t('support.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => router.back()} right={<MaterialCommunityIcons name="plus" size={23} color="#3E5877" />} onRightPress={() => setCreateOpen(true)} /><View style={styles.accountBody}><View style={styles.supportIntro}><View style={styles.entryIcon}><MaterialCommunityIcons name="lifebuoy" size={20} color={colors.blue} /></View><View style={styles.entryCopy}><Text style={styles.entryTitle}>{t('support.introTitle')}</Text><Text style={styles.notificationText}>{t('support.introCopy')}</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{SUPPORT_STATUSES.map((item) => <Pressable key={item} onPress={() => setStatus(item)} style={[styles.chip, status === item && styles.chipActive]}><Text style={[styles.chipText, status === item && styles.chipTextActive]}>{apiLabel('support.status', item)}</Text></Pressable>)}</ScrollView>{error ? <InlineError message={error} /> : null}{tickets.length ? tickets.map((ticket) => <Pressable key={ticket.id} onPress={() => void open(ticket.id)} style={styles.ticket}><View style={styles.ticketTop}><View style={{ flex: 1 }}><Text style={styles.ticketNo}>{ticket.ticket_no}</Text><Text numberOfLines={1} style={styles.entryTitle}>{ticket.subject}</Text></View><View style={styles.statusPill}><Text style={styles.statusText}>{apiLabel('support.status', ticket.status)}</Text></View></View><Text style={styles.ticketMeta}>{apiLabel('support.category', ticket.category)} · {t('support.priorityLabel', { priority: apiLabel('support.priority', ticket.priority) })} · {relativeTime(ticket.updated_at, language)}</Text>{ticket.user_unread_count ? <Text style={styles.newReply}>{t('support.newReply')}</Text> : null}</Pressable>) : <EmptyAccount title={t('support.empty')} copy={t('support.emptyCopy')} />}</View><BottomSheet visible={createOpen} title={t('support.newTicket')} subtitle={t('support.newTicketSubtitle')} onClose={() => setCreateOpen(false)}><Text style={styles.fieldLabel}>{t('support.issueCategory')}</Text><ChipPicker namespace="support.category" values={supportCategories} value={category} onChange={setCategory} /><Text style={styles.fieldLabel}>{t('support.priority')}</Text><ChipPicker namespace="support.priority" values={supportPriorities} value={priority} onChange={setPriority} /><Field label={t('support.subject')} value={subject} onChangeText={setSubject} placeholder={t('support.subjectPlaceholder')} maxLength={180} /><Text style={styles.fieldLabel}>{t('support.description')}</Text><TextInput value={description} onChangeText={setDescription} multiline maxLength={10000} placeholder={t('support.descriptionPlaceholder')} placeholderTextColor="#7C8BA0" style={[styles.field, styles.textarea]} /><AttachmentControl attachment={attachment} onPick={() => void choose()} onClear={() => setAttachment(null)} /><AppButton label={submitting ? t('support.submitting') : t('support.createTicket')} disabled={submitting} onPress={() => void create()} style={styles.saveButton} /></BottomSheet><BottomSheet visible={Boolean(selected)} title={selected?.ticket_no || t('support.title')} subtitle={selected?.subject} onClose={() => setSelected(null)}>{selected ? <><View style={styles.ticketDetail}><Text style={styles.ticketMeta}>{apiLabel('support.category', selected.category)} · {t('support.priorityLabel', { priority: readable(selected.priority) })}</Text><View style={styles.ticketAction}>{(selected.status === 'closed' || selected.status === 'resolved') ? <AppButton label={t('support.reopen')} variant="secondary" disabled={submitting} onPress={() => void update(true)} /> : <AppButton label={t('support.close')} variant="secondary" disabled={submitting} onPress={() => void update(false)} />}</View></View>{selected.messages?.map((message) => <View key={message.id} style={[styles.supportBubble, message.sender_role === 'seller' && styles.supportBubbleMine]}><Text style={[styles.supportBubbleText, message.sender_role === 'seller' && styles.supportBubbleMineText]}>{message.body || t('support.attachment')}</Text>{message.attachment_url ? <Pressable onPress={() => void Linking.openURL(message.attachment_url!)}><Text style={[styles.attachmentLink, message.sender_role === 'seller' && styles.supportBubbleMineText]}>{message.attachment_name || t('support.openAttachment')}</Text></Pressable> : null}<Text style={[styles.supportTime, message.sender_role === 'seller' && styles.supportBubbleMineText]}>{message.sender_role === 'seller' ? t('support.you') : message.sender?.name || 'Support'} · {relativeTime(message.created_at, language)}</Text></View>)}{selected.status !== 'closed' ? <><TextInput value={reply} onChangeText={setReply} multiline placeholder={t('support.replyPlaceholder')} placeholderTextColor="#7C8BA0" style={[styles.field, styles.textarea, { marginTop: 12 }]} /><AttachmentControl attachment={attachment} onPick={() => void choose()} onClear={() => setAttachment(null)} /><AppButton label={submitting ? t('support.sending') : t('support.sendReply')} disabled={submitting || (!reply.trim() && !attachment)} onPress={() => void sendReply()} style={styles.saveButton} /></> : <Notice text={t('support.closedNotice')} />}</> : null}</BottomSheet></Screen>;
}

function ChipPicker<T extends string>({ values, value, onChange, namespace }: { values: T[]; value: T; onChange: (value: T) => void; namespace: string }) { return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{values.map((item) => <Pressable key={item} onPress={() => onChange(item)} style={[styles.chip, value === item && styles.chipActive]}><Text style={[styles.chipText, value === item && styles.chipTextActive]}>{apiLabel(namespace, item)}</Text></Pressable>)}</ScrollView>; }
function AttachmentControl({ attachment, onPick, onClear }: { attachment: { name: string } | null; onPick: () => void; onClear: () => void }) { const { t } = useLanguage(); return <View style={styles.attachmentControl}><Pressable onPress={onPick} style={styles.attachFile}><MaterialCommunityIcons name="paperclip" size={18} color={colors.blue} /><Text style={styles.textAction}>{attachment?.name || t('support.attachment')}</Text></Pressable>{attachment ? <Pressable onPress={onClear}><MaterialCommunityIcons name="close" size={18} color="#526780" /></Pressable> : null}</View>; }

export function FaqsScreen() { const { t } = useLanguage(); const items = [{ icon: 'package-variant-plus', title: t('faqs.productsQ'), copy: t('faqs.productsA') }, { icon: 'storefront-outline', title: t('faqs.storeQ'), copy: t('faqs.storeA') }, { icon: 'account-lock-outline', title: t('faqs.accountQ'), copy: t('faqs.accountA') }]; return <Screen contentStyle={styles.bottom}><AppHeader title={t('faqs.title')} left={<MaterialCommunityIcons name="arrow-left" size={22} color="#3E5877" />} onLeftPress={() => router.back()} right={null} /><View style={styles.accountBody}><Text style={styles.faqTitle}>{t('faqs.heading')}</Text><Text style={styles.faqCopy}>{t('faqs.copy')}</Text>{items.map((item) => <View key={item.title} style={styles.faq}><View style={styles.entryIcon}><MaterialCommunityIcons name={item.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']} size={19} color={colors.blue} /></View><View style={styles.entryCopy}><Text style={styles.entryTitle}>{item.title}</Text><Text style={styles.notificationText}>{item.copy}</Text></View></View>)}<AppButton label={t('faqs.contactSupport')} variant="secondary" onPress={() => router.push('/support')} style={styles.saveButton} /></View></Screen>; }

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { const { t } = useLanguage(); const isReadOnly = label === t('account.email') || props.editable === false; return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={[styles.field, isReadOnly && { backgroundColor: '#EEF2F7', color: '#718096' }]} placeholderTextColor="#7C8BA0" editable={isReadOnly ? false : props.editable} selectTextOnFocus={isReadOnly ? false : props.selectTextOnFocus} {...props} /></View>; }
function SmallStat({ label, value }: { label: string; value: string }) { return <View style={styles.smallStat}><Text style={styles.smallValue}>{value}</Text><Text style={styles.smallLabel}>{label}</Text></View>; }
function InlineError({ message }: { message: string }) { return <View style={styles.error}><MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.red} /><Text style={styles.errorText}>{message}</Text></View>; }
function Notice({ text }: { text: string }) { return <View style={styles.notice}><MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.green} /><Text style={styles.noticeText}>{text}</Text></View>; }
function LoadingAccount({ label }: { label: string }) { return <View style={styles.loading}><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.loadingText}>{label}</Text></View>; }
function EmptyAccount({ title, copy }: { title: string; copy: string }) { return <View style={styles.empty}><MaterialCommunityIcons name="inbox-outline" size={29} color={colors.blue} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{copy}</Text></View>; }

const styles = StyleSheet.create({ bottom: { paddingBottom: 128 }, profileBody: { padding: 20 }, hero: { borderRadius: radius.lg, padding: 15 }, heroTop: { flexDirection: 'row', alignItems: 'center' }, heroAvatar: { width: 57, height: 57, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }, heroInitial: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' }, heroCopy: { flex: 1, minWidth: 0, marginLeft: 11 }, heroName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' }, heroEmail: { color: '#D9EDFF', fontSize: 11, marginTop: 3 }, editProfile: { alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,.16)', flexDirection: 'row', gap: 4, alignItems: 'center' }, editProfileText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' }, heroStats: { flexDirection: 'row', marginTop: 15, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.12)' }, heroStat: { flex: 1, paddingVertical: 9, alignItems: 'center' }, heroStatValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, heroStatLabel: { color: '#D6ECFF', fontSize: 10, marginTop: 2 }, sectionLabel: { color: '#708097', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 20, marginBottom: 7 }, menuCard: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface, ...shadow.card }, menuRow: { minHeight: 65, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }, menuRowLine: { borderBottomWidth: 1, borderBottomColor: colors.line }, menuIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.blueSoft }, menuCopy: { flex: 1, minWidth: 0, marginLeft: 10 }, menuTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, menuText: { color: colors.subtle, fontSize: 10, marginTop: 3 }, menuBadge: { minWidth: 19, height: 19, marginRight: 8, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E34C57' }, menuBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' }, signOut: { marginTop: 12 }, accountBody: { padding: 20 }, accountToggle: { flexDirection: 'row', padding: 4, borderRadius: 13, backgroundColor: '#EAF0F7', marginBottom: 13 }, accountTab: { flex: 1, minHeight: 39, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, accountTabActive: { backgroundColor: colors.blue }, accountTabText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, accountTabTextActive: { color: '#FFFFFF' }, photoBlock: { minHeight: 80, padding: 12, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, ...shadow.card }, accountPhoto: { height: 54, width: 54, borderRadius: 17, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, accountPhotoInitial: { color: colors.blue, fontSize: 22, fontWeight: '800' }, photoTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, photoCopy: { color: colors.subtle, fontSize: 11, marginTop: 3 }, textAction: { color: colors.blue, fontSize: 11, fontWeight: '800', marginTop: 6 }, formHeading: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 18 }, formCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, fieldGroup: { marginTop: 14 }, fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 6 }, field: { minHeight: 49, borderRadius: 11, paddingHorizontal: 12, backgroundColor: colors.surface, color: colors.ink, fontSize: 13, ...shadow.card }, textarea: { minHeight: 105, paddingTop: 12, textAlignVertical: 'top' }, saveButton: { marginTop: 22 }, error: { padding: 11, borderRadius: 11, backgroundColor: '#FFF0F1', flexDirection: 'row', gap: 8, marginBottom: 12 }, errorText: { flex: 1, color: colors.red, fontSize: 12, lineHeight: 17, fontWeight: '700' }, notice: { padding: 11, borderRadius: 11, backgroundColor: colors.greenSoft, flexDirection: 'row', gap: 8, marginBottom: 12 }, noticeText: { flex: 1, color: colors.green, fontSize: 12, lineHeight: 17, fontWeight: '700' }, loading: { minHeight: 240, justifyContent: 'center', alignItems: 'center', gap: 12 }, loadingText: { color: colors.muted, fontSize: 13 }, walletHero: { borderRadius: radius.lg, padding: 17 }, walletLabel: { color: '#D7E9FF', fontSize: 10, fontWeight: '800', letterSpacing: .8 }, walletBalance: { color: '#FFFFFF', fontSize: 29, letterSpacing: -1.2, fontWeight: '800', marginTop: 5 }, walletSub: { color: '#D7E9FF', fontSize: 11, marginTop: 5 }, walletStats: { flexDirection: 'row', gap: 10, marginTop: 10 }, smallStat: { flex: 1, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card }, smallValue: { color: colors.ink, fontSize: 14, fontWeight: '800' }, smallLabel: { color: colors.subtle, fontSize: 10, marginTop: 4 }, entry: { minHeight: 63, padding: 10, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', marginTop: 8, ...shadow.card }, entryIcon: { height: 35, width: 35, borderRadius: 11, backgroundColor: colors.blueSoft, justifyContent: 'center', alignItems: 'center' }, entryCopy: { flex: 1, minWidth: 0, marginLeft: 9 }, entryTitle: { color: colors.ink, fontSize: 12, fontWeight: '800', textTransform: 'capitalize' }, entryMeta: { color: colors.subtle, fontSize: 10, marginTop: 3, textTransform: 'capitalize' }, entryAmount: { color: colors.ink, fontSize: 12, fontWeight: '800', marginLeft: 8 }, review: { padding: 13, borderRadius: radius.md, backgroundColor: colors.surface, marginTop: 9, ...shadow.card }, reviewTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, reviewName: { color: colors.ink, fontSize: 13, fontWeight: '800' }, reviewStars: { color: '#DE9A1D', fontSize: 12 }, reviewText: { color: '#415A76', fontSize: 12, lineHeight: 18, marginTop: 7 }, reviewMeta: { color: colors.subtle, fontSize: 10, marginTop: 7 }, notification: { minHeight: 69, padding: 10, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', marginTop: 8, ...shadow.card }, notificationUnread: { borderWidth: 1, borderColor: '#CFE1FA', backgroundColor: '#F7FBFF' }, notificationText: { color: '#516983', fontSize: 11, lineHeight: 16, marginTop: 3 }, unreadDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: colors.blue, marginLeft: 7 }, empty: { minHeight: 190, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25 }, emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 9 }, emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 }, followerHero: { minHeight: 76, padding: 13, borderRadius: radius.md, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#F4F0FF' }, followerHeading: { color: colors.ink, fontSize: 14, fontWeight: '800' }, followerCopy: { color: colors.muted, fontSize: 11, marginTop: 3 }, totalPill: { minWidth: 37, height: 29, paddingHorizontal: 8, borderRadius: 15, backgroundColor: '#E5D9FF', alignItems: 'center', justifyContent: 'center' }, totalText: { color: '#6332BE', fontSize: 12, fontWeight: '800' }, followerRow: { minHeight: 67, padding: 10, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', marginTop: 8, ...shadow.card }, followerAvatar: { height: 40, width: 40, borderRadius: 20, backgroundColor: '#EEE6FF', alignItems: 'center', justifyContent: 'center' }, followerInitial: { color: '#6332BE', fontSize: 15, fontWeight: '800' }, followerMeta: { color: '#9CA8B7', fontSize: 9, marginTop: 2 }, supportIntro: { minHeight: 65, padding: 10, borderRadius: radius.md, backgroundColor: '#F1F7FF', flexDirection: 'row', alignItems: 'center', ...shadow.card }, chips: { gap: 7, paddingVertical: 13, paddingRight: 20 }, chip: { minHeight: 33, paddingHorizontal: 11, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#DCE5F0' }, chipActive: { backgroundColor: colors.blue, borderColor: colors.blue }, chipText: { color: colors.muted, fontSize: 11, fontWeight: '800' }, chipTextActive: { color: '#FFFFFF' }, ticket: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, marginTop: 8, ...shadow.card }, ticketTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, ticketNo: { color: colors.blue, fontSize: 10, fontWeight: '800', letterSpacing: .4, marginBottom: 4 }, statusPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: colors.blueSoft }, statusText: { color: colors.blue, fontSize: 9, fontWeight: '800' }, ticketMeta: { color: colors.subtle, fontSize: 10, marginTop: 7 }, newReply: { color: '#6332BE', fontSize: 10, fontWeight: '800', marginTop: 7 }, attachmentControl: { minHeight: 43, marginTop: 12, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#F2F6FB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, attachFile: { flexDirection: 'row', gap: 7, alignItems: 'center', flex: 1 }, ticketDetail: { padding: 10, borderRadius: 11, backgroundColor: '#F2F6FB' }, ticketAction: { marginTop: 10, alignSelf: 'flex-start' }, supportBubble: { alignSelf: 'flex-start', maxWidth: '88%', padding: 11, borderRadius: 13, backgroundColor: colors.surface, marginTop: 8, ...shadow.card }, supportBubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.blue }, supportBubbleText: { color: colors.ink, fontSize: 12, lineHeight: 18 }, supportBubbleMineText: { color: '#FFFFFF' }, attachmentLink: { color: colors.blue, fontSize: 11, fontWeight: '800', marginTop: 6, textDecorationLine: 'underline' }, supportTime: { color: colors.subtle, fontSize: 9, marginTop: 6 }, faqTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' }, faqCopy: { color: colors.muted, fontSize: 12, marginTop: 5, lineHeight: 18 }, faq: { minHeight: 75, padding: 11, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, ...shadow.card }, });
