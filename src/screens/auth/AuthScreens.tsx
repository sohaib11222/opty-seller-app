import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthScaffold } from '../../components/auth/AuthScaffold';
import { AppButton } from '../../components/ui/AppButton';
import { LanguageToggle } from '../../components/ui/LanguageToggle';
import { PhoneField } from '../../components/ui/PhoneField';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { useAuth } from '../../features/auth/AuthContext';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { markOnboardingSeen } from '../../features/onboarding/onboardingStorage';
import { DEFAULT_COUNTRY_ISO, findPhoneCountry, toE164, type PhoneCountry } from '../../lib/phoneCountries';
import { getErrorMessage } from '../../services/api/client';
import { authService } from '../../services/auth/auth.service';
import { getSellerDestination, storeService } from '../../services/seller/store.service';
import { colors, radius, shadow } from '../../theme/tokens';

const footer = (question: string, action: string, onPress: () => void) => (
  <Text style={styles.footerText}>{question} <Text onPress={onPress} style={styles.footerAction}>{action}</Text></Text>
);
const sellerLogo = require('../../../assets/brand/vista-seller-logo.png');

function ErrorNotice({ error }: { error: string | null }) {
  return error ? <View accessibilityRole="alert" style={styles.errorNotice}><MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.red} /><Text style={styles.errorText}>{error}</Text></View> : null;
}

export function SplashScreen() {
  const { t } = useLanguage();
  return (
    <Screen scroll={false} backgroundColor="#0B3268" statusBarStyle="light" transparentStatusBar style={styles.splash} contentStyle={styles.splashContent}>
      <View style={styles.splashGlowOne} /><View style={styles.splashGlowTwo} />
      <View style={styles.splashMark}><Image source={sellerLogo} resizeMode="contain" style={styles.splashLogo} /></View>
      <Text style={styles.splashEyebrow}>{t('splash.eyebrow')}</Text>
      <View style={styles.splashFooter}><View style={styles.loadingBar}><View style={styles.loadingProgress} /></View><Text style={styles.splashCaption}>{t('splash.caption')}</Text></View>
    </Screen>
  );
}

/** Approved three-panel seller introduction, backed by local app assets. */
const onboardingPages = [
  { image: require('../../../assets/onboarding/seller-store.png'), eyebrow: 'onboarding.page1.eyebrow', title: 'onboarding.page1.title', description: 'onboarding.page1.description' },
  { image: require('../../../assets/onboarding/seller-analytics.png'), eyebrow: 'onboarding.page2.eyebrow', title: 'onboarding.page2.title', description: 'onboarding.page2.description' },
  { image: require('../../../assets/onboarding/seller-fulfilment.png'), eyebrow: 'onboarding.page3.eyebrow', title: 'onboarding.page3.title', description: 'onboarding.page3.description' },
] as const;

const ONBOARDING_ART_ASPECT_RATIO = 1672 / 941;

export function OnboardingScreen() {
  const { t } = useLanguage();
  const { height, width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const current = onboardingPages[page];
  const lastPage = page === onboardingPages.length - 1;
  const compact = height < 700;
  // Every exit path records the introduction as seen so it is shown once only.
  const leaveOnboarding = () => { void markOnboardingSeen(); router.replace('/sign-in'); };
  const continueOnboarding = () => lastPage ? leaveOnboarding() : setPage((value) => value + 1);

  return (
    <Screen scroll={false} backgroundColor="#FFFFFF" contentStyle={styles.onboarding} statusBarStyle="light" transparentStatusBar>
      <View style={styles.onboardingPage}>
        <View style={[styles.onboardingHero, compact && styles.onboardingHeroCompact]}>
          <Image source={current.image} resizeMode="stretch" style={[styles.onboardingHeroImage, { width, height: width * ONBOARDING_ART_ASPECT_RATIO }]} />
          <LinearGradient colors={['rgba(2, 18, 44, 0.04)', 'rgba(2, 18, 44, 0.20)']} style={styles.onboardingHeroShade} />
          <View accessibilityRole="image" accessibilityLabel={t('onboarding.page1.eyebrow')} style={styles.onboardingBrandLogo}><Image source={sellerLogo} resizeMode="contain" style={styles.onboardingBrandLogoImage} /></View>
          <View style={styles.onboardingLanguageToggle}><LanguageToggle variant="overlay" /></View>
        </View>

        <View style={[styles.onboardingCard, compact && styles.onboardingCardCompact]}>
          <View style={styles.onboardingDots} accessibilityLabel={t('onboarding.dotsA11y', { page: page + 1 })}>
            {onboardingPages.map((entry, index) => <View key={entry.title} style={[styles.onboardingDot, index === page && styles.onboardingDotActive]} />)}
          </View>
          <Text style={styles.onboardingEyebrow}>{t(current.eyebrow)}</Text>
          <Text style={styles.onboardingTitle}>{t(current.title)}</Text>
          <Text style={styles.onboardingDescription}>{t(current.description)}</Text>
          <View style={styles.onboardingFooter}>
            <Pressable accessibilityRole="button" onPress={continueOnboarding} style={({ pressed }) => [styles.onboardingButton, pressed && styles.onboardingButtonPressed]}>
              <Text style={styles.onboardingButtonText}>{t(lastPage ? 'onboarding.getStarted' : 'onboarding.next')}</Text>
              {!lastPage ? <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" /> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('onboarding.skip')} onPress={leaveOnboarding} hitSlop={10} style={styles.onboardingBottomSkip}>
              <Text style={styles.onboardingBottomSkipText}>{t('onboarding.skip')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

export function LoginScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ reset?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await signIn({ email: email.trim(), password });
      const store = await storeService.getStore();
      // Read the account back so the gate sees the authoritative verification state.
      const { user } = await authService.getProfile();
      router.replace(getSellerDestination(store, user));
    } catch (cause) { setError(getErrorMessage(cause)); } finally { setBusy(false); }
  };
  return (
    <AuthScaffold eyebrow={t('auth.secureSignIn')} title={t('auth.goodToSeeYou')} description={t('auth.loginDescription')} artTitle={t('auth.welcomeBack')} artEyebrow={t('onboarding.art.eyebrow')} topAction={<LanguageToggle variant="overlay" />} footer={footer(t('auth.newTo'), t('auth.createSellerAccount'), () => router.push('/sign-up'))}>
      {params.reset === 'success' ? <View style={styles.sentNotice}><MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.green} /><Text style={styles.sentText}>{t('auth.passwordUpdated')}</Text></View> : null}
      <ErrorNotice error={error} />
      <TextField label={t('auth.emailLabel')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder={t('auth.emailPlaceholder')} />
      <TextField label={t('auth.passwordLabel')} value={password} onChangeText={setPassword} autoComplete="current-password" secureTextEntry placeholder={t('auth.passwordPlaceholder')} />
      <View style={styles.signInOptions}><Text style={styles.remember}>{t('auth.sessionSecured')}</Text><Text onPress={() => router.push('/forgot-password')} style={styles.forgot}>{t('auth.forgotPassword')}</Text></View>
      <AppButton label={busy ? t('auth.signingIn') : t('auth.signInToWorkspace')} disabled={busy} onPress={() => void submit()} style={styles.submit} />
      <AppButton label={t('auth.createSellerAccount')} variant="secondary" onPress={() => router.push('/sign-up')} style={styles.secondaryButton} />
    </AuthScaffold>
  );
}

export function RegisterScreen() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>(() => findPhoneCountry(DEFAULT_COUNTRY_ISO));
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState(''); const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 6) { setError(t('auth.phoneInvalid')); return; }
    setBusy(true); setError(null);
    try {
      await register({ name: name.trim(), email: email.trim(), phone: toE164(phoneCountry.dial, phoneNumber), password, passwordConfirmation });
      router.replace('/verify-email');
    } catch (cause) { setError(getErrorMessage(cause)); } finally { setBusy(false); }
  };
  return (
    <AuthScaffold back onBack={() => router.back()} eyebrow={t('auth.registerEyebrow')} title={t('auth.registerTitle')} description={t('auth.registerDescription')} artTitle={t('auth.startSelling')} artEyebrow={t('auth.createSellerAccountArt')} footer={footer(t('auth.alreadyHaveAccount'), t('auth.signIn'), () => router.replace('/sign-in'))}>
      <ErrorNotice error={error} />
      <TextField label={t('auth.nameLabel')} value={name} onChangeText={setName} autoComplete="name" placeholder={t('auth.namePlaceholder')} />
      <TextField label={t('auth.businessEmailLabel')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder={t('auth.emailPlaceholder')} />
      <PhoneField
        label={t('auth.phoneLabel')}
        helper={t('auth.phoneHelper')}
        placeholder={t('auth.phonePlaceholder')}
        value={phoneNumber}
        onChangeValue={setPhoneNumber}
        country={phoneCountry}
        onChangeCountry={setPhoneCountry}
      />
      <TextField label={t('auth.createPasswordLabel')} value={password} onChangeText={setPassword} autoComplete="new-password" secureTextEntry placeholder={t('auth.passwordMinPlaceholder')} />
      <TextField label={t('auth.confirmPasswordLabel')} value={passwordConfirmation} onChangeText={setPasswordConfirmation} autoComplete="new-password" secureTextEntry placeholder={t('auth.repeatPassword')} />
      <AppButton label={busy ? t('auth.creatingAccount') : t('auth.createSellerAccount')} disabled={busy} onPress={() => void submit()} style={styles.submit} />
      <Text style={styles.terms}>{t('auth.termsNotice')}</Text>
    </AuthScaffold>
  );
}

export function ForgotPasswordScreen() {
  const { t } = useLanguage();
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setError(null);
    try { await authService.requestPasswordReset(email.trim()); router.replace({ pathname: '/reset-password', params: { email: email.trim() } }); } catch (cause) { setError(getErrorMessage(cause)); } finally { setBusy(false); }
  };
  return (
    <AuthScaffold back onBack={() => router.back()} eyebrow={t('auth.forgotEyebrow')} title={t('auth.forgotTitle')} description={t('auth.forgotDescription')} artTitle={t('auth.accountRecovery')} artEyebrow={t('auth.safeAndSimple')}>
      <ErrorNotice error={error} />
      <TextField label={t('auth.sellerEmailLabel')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder={t('auth.emailPlaceholder')} />
      <AppButton label={busy ? t('auth.sendingCode') : t('auth.sendCode')} disabled={busy} onPress={() => void submit()} style={styles.submit} />
      <AppButton label={t('auth.backToSignIn')} variant="text" onPress={() => router.replace('/sign-in')} style={styles.secondaryButton} />
    </AuthScaffold>
  );
}

export function ResetPasswordScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? ''); const [code, setCode] = useState(''); const [resetToken, setResetToken] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const verified = Boolean(resetToken);
  const verify = async () => {
    setBusy(true); setError(null);
    try { const response = await authService.verifyPasswordResetCode(email.trim(), code.trim()); setResetToken(response.reset_token); } catch (cause) { setError(getErrorMessage(cause)); } finally { setBusy(false); }
  };
  const submit = async () => {
    setBusy(true); setError(null);
    try { await authService.resetPassword(email.trim(), resetToken, password, confirm); router.replace({ pathname: '/sign-in', params: { reset: 'success' } }); } catch (cause) { setError(getErrorMessage(cause)); } finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setError(null);
    try { await authService.requestPasswordReset(email.trim()); setCode(''); } catch (cause) { setError(getErrorMessage(cause)); } finally { setBusy(false); }
  };
  return (
    <AuthScaffold back onBack={() => router.back()} eyebrow={t('auth.resetEyebrow')} title={verified ? t('auth.resetTitleChoose') : t('auth.resetTitleCheck')} description={verified ? t('auth.resetDescriptionChoose') : t('auth.resetDescriptionCheck')} artTitle={t('auth.newPasswordArt')} artEyebrow={t('auth.secureYourWorkspace')}>
      <ErrorNotice error={error} />
      <TextField label={t('auth.sellerEmailLabel')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder={t('auth.emailPlaceholder')} editable={!verified} />
      {!verified ? <><TextField label={t('auth.verificationCodeLabel')} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" placeholder={t('auth.sixDigitCode')} maxLength={6} /><AppButton label={busy ? t('auth.verifying') : t('auth.verifyCode')} disabled={busy || code.length !== 6} onPress={() => void verify()} style={styles.submit} /><AppButton label={t('auth.resendCode')} variant="text" disabled={busy} onPress={() => void resend()} style={styles.secondaryButton} /></> : <><View style={styles.sentNotice}><MaterialCommunityIcons name="check-circle-outline" size={22} color={colors.green} /><Text style={styles.sentText}>{t('auth.codeConfirmed')}</Text></View><TextField label={t('auth.newPasswordLabel')} value={password} onChangeText={setPassword} autoComplete="new-password" secureTextEntry placeholder={t('auth.createNewPassword')} /><TextField label={t('auth.confirmNewPasswordLabel')} value={confirm} onChangeText={setConfirm} autoComplete="new-password" secureTextEntry placeholder={t('auth.repeatPassword')} /><View style={styles.passwordHint}><View style={styles.hintIcon}><MaterialCommunityIcons name="check" size={17} color={colors.green} /></View><View><Text style={styles.hintTitle}>{t('auth.strongPassword')}</Text><Text style={styles.hintCopy}>{t('auth.strongPasswordCopy')}</Text></View></View><AppButton label={busy ? t('auth.savingPassword') : t('auth.saveNewPassword')} disabled={busy} onPress={() => void submit()} style={styles.submit} /></>}
    </AuthScaffold>
  );
}

export function VerifyEmailScreen() {
  const { t } = useLanguage();
  const { session, sendVerificationCode, verifyEmail } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const email = session?.user.email ?? '';

  const confirm = async () => {
    setBusy(true); setError(null);
    try {
      await verifyEmail(code.trim());
      router.replace('/verification');
    } catch (cause) { setError(getErrorMessage(cause)); } finally { setBusy(false); }
  };

  const resend = async () => {
    setSending(true); setError(null);
    try { await sendVerificationCode(); setCode(''); } catch (cause) { setError(getErrorMessage(cause)); } finally { setSending(false); }
  };

  return (
    <AuthScaffold back onBack={() => router.replace('/sign-in')} eyebrow={t('auth.verifyEmailEyebrow')} title={t('auth.verifyEmailTitle')} description={t('auth.verifyEmailDescription')} artTitle={t('auth.verifyEmailArt')} artEyebrow={t('auth.sellerApplication')}>
      <ErrorNotice error={error} />
      <View style={styles.sentNotice}><MaterialCommunityIcons name="email-check-outline" size={20} color={colors.green} /><Text style={styles.sentText}>{t('auth.verifyEmailSentTo', { email })}</Text></View>
      <TextField label={t('auth.verificationCodeLabel')} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" placeholder={t('auth.sixDigitCode')} maxLength={6} />
      <AppButton label={busy ? t('auth.verifying') : t('auth.confirmEmail')} disabled={busy || code.length !== 6} onPress={() => void confirm()} style={styles.submit} />
      <AppButton label={t('auth.resendCode')} variant="text" disabled={sending || busy} onPress={() => void resend()} style={styles.secondaryButton} />
    </AuthScaffold>
  );
}

export function BusinessVerificationScreen() {
  const { t } = useLanguage();
  const { submitBusinessVerification } = useAuth();
  const [businessType, setBusinessType] = useState(''); const [businessRegistration, setBusinessRegistration] = useState(''); const [taxId, setTaxId] = useState(''); const [businessAddress, setBusinessAddress] = useState(''); const [website, setWebsite] = useState(''); const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await submitBusinessVerification({ businessType, businessRegistration, taxId, businessAddress, website, idDocumentUrl });
      router.replace('/pending-review');
    } catch (cause) { setError(getErrorMessage(cause)); } finally { setBusy(false); }
  };
  return (
    <AuthScaffold eyebrow={t('auth.verifyEyebrow')} title={t('auth.verifyTitle')} description={t('auth.verifyDescription')} artTitle={t('auth.verifyStoreArt')} artEyebrow={t('auth.sellerApplication')}>
      <ErrorNotice error={error} />
      <TextField label={t('auth.businessTypeLabel')} value={businessType} onChangeText={setBusinessType} placeholder={t('auth.businessTypePlaceholder')} />
      <TextField label={t('auth.registrationLabel')} value={businessRegistration} onChangeText={setBusinessRegistration} placeholder={t('auth.registrationPlaceholder')} />
      <TextField label={t('auth.taxIdLabel')} value={taxId} onChangeText={setTaxId} placeholder={t('auth.taxIdPlaceholder')} />
      <TextField label={t('auth.businessAddressLabel')} value={businessAddress} onChangeText={setBusinessAddress} placeholder={t('auth.businessAddressPlaceholder')} multiline />
      <TextField label={t('auth.websiteLabel')} value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" placeholder={t('auth.websitePlaceholder')} />
      <TextField label={t('auth.idDocumentLabel')} value={idDocumentUrl} onChangeText={setIdDocumentUrl} autoCapitalize="none" keyboardType="url" placeholder={t('auth.idDocumentPlaceholder')} helper={t('auth.idDocumentHelper')} />
      <AppButton label={busy ? t('auth.submitting') : t('auth.submitForReview')} disabled={busy} onPress={() => void submit()} style={styles.submit} />
    </AuthScaffold>
  );
}

export function PendingReviewScreen() {
  const { t } = useLanguage();
  const { signOut, session } = useAuth(); const [checking, setChecking] = useState(false); const [error, setError] = useState<string | null>(null);
  const checkStatus = async () => {
    setChecking(true); setError(null);
    try {
      const destination = getSellerDestination(await storeService.getStore(), session?.user);
      if (destination !== '/pending-review') router.replace(destination);
    } catch (cause) { setError(getErrorMessage(cause)); } finally { setChecking(false); }
  };
  useEffect(() => { const timer = setInterval(() => void checkStatus(), 15_000); return () => clearInterval(timer); });
  return (
    <AuthScaffold eyebrow={t('auth.reviewEyebrow')} title={t('auth.reviewTitle')} description={t('auth.reviewDescription')} artTitle={t('auth.reviewingArt')} artEyebrow={t('auth.sellerApplication')}>
      <ErrorNotice error={error} />
      <ReviewStep number="1" color="#E8F8EF" iconColor={colors.green} title={t('auth.reviewStep1Title')} copy={t('auth.reviewStep1Copy')} />
      <ReviewStep number="2" color="#FFF3DA" iconColor="#A86B06" title={t('auth.reviewStep2Title')} copy={t('auth.reviewStep2Copy')} />
      <AppButton label={checking ? t('auth.checkingStatus') : t('auth.checkReviewStatus')} disabled={checking} onPress={() => void checkStatus()} style={styles.submit} />
      <AppButton label={t('auth.signOut')} variant="secondary" onPress={() => void signOut()} style={styles.secondaryButton} />
    </AuthScaffold>
  );
}

function ReviewStep({ number, color, iconColor, title, copy }: { number: string; color: string; iconColor: string; title: string; copy: string }) {
  return <View style={styles.reviewStep}><View style={[styles.reviewNumber, { backgroundColor: color }]}><Text style={{ color: iconColor, fontWeight: '800' }}>{number}</Text></View><View><Text style={styles.hintTitle}>{title}</Text><Text style={styles.hintCopy}>{copy}</Text></View></View>;
}

const styles = StyleSheet.create({
  splash: { backgroundColor: '#0B3268' }, splashContent: { alignItems: 'center', justifyContent: 'center', padding: 28 }, splashGlowOne: { position: 'absolute', top: -100, left: -75, width: 270, height: 270, borderRadius: 135, backgroundColor: '#1765C9', opacity: 0.55 }, splashGlowTwo: { position: 'absolute', bottom: -80, right: -60, width: 230, height: 230, borderRadius: 115, backgroundColor: '#23B09B', opacity: 0.55 }, splashMark: { width: 196, height: 98, padding: 5, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)' }, splashLogo: { width: '100%', height: '100%' }, splashEyebrow: { color: '#D8EEFF', fontSize: 11, letterSpacing: 1.4, fontWeight: '800', marginTop: 12 }, splashFooter: { position: 'absolute', bottom: 44, left: 28, right: 28 }, loadingBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }, loadingProgress: { width: '68%', height: '100%', borderRadius: 99, backgroundColor: '#FFFFFF' }, splashCaption: { textAlign: 'center', marginTop: 12, color: '#D8EEFF', fontSize: 12 },
  onboarding: { backgroundColor: '#FFFFFF' }, onboardingPage: { flex: 1, backgroundColor: '#FFFFFF' }, onboardingHero: { height: '59%', minHeight: 392, overflow: 'hidden' }, onboardingHeroCompact: { height: '56%', minHeight: 348 }, onboardingHeroImage: { position: 'absolute', top: 0, left: 0 }, onboardingHeroShade: { ...StyleSheet.absoluteFill }, onboardingBrandLogo: { position: 'absolute', top: 12, left: 16, width: 120, height: 60, padding: 4, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)' }, onboardingBrandLogoImage: { width: '100%', height: '100%' }, onboardingLanguageToggle: { position: 'absolute', top: 14, right: 18 }, onboardingCard: { flex: 1, marginTop: -72, minHeight: 316, borderTopLeftRadius: 34, borderTopRightRadius: 34, backgroundColor: '#FFFFFF', paddingHorizontal: 28, paddingTop: 27, paddingBottom: 18, shadowColor: '#0B1930', shadowOpacity: 0.11, shadowRadius: 22, shadowOffset: { width: 0, height: -7 }, elevation: 9 }, onboardingCardCompact: { minHeight: 292, paddingTop: 22, paddingHorizontal: 24 }, onboardingDots: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 }, onboardingDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: '#DDE4ED' }, onboardingDotActive: { width: 24, backgroundColor: colors.teal }, onboardingEyebrow: { color: colors.teal, fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: 1.35, textTransform: 'uppercase' }, onboardingTitle: { color: colors.ink, fontSize: 31, lineHeight: 37, letterSpacing: -1.15, fontWeight: '800', marginTop: 9 }, onboardingDescription: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 340 }, onboardingFooter: { marginTop: 'auto', paddingTop: 18, gap: 14 }, onboardingButton: { minHeight: 54, borderRadius: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, backgroundColor: '#0B3976', shadowColor: '#0B3976', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 }, onboardingButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }, onboardingButtonPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] }, onboardingBottomSkip: { alignSelf: 'center', minHeight: 24, justifyContent: 'center', paddingHorizontal: 10 }, onboardingBottomSkipText: { color: '#7B899B', fontSize: 13, fontWeight: '800' },
  secondaryButton: { marginTop: 10 }, skip: { alignItems: 'center', paddingVertical: 14 }, skipText: { color: colors.muted, fontSize: 13, fontWeight: '700' }, signInOptions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, gap: 10 }, remember: { color: colors.muted, fontSize: 12, flex: 1 }, forgot: { color: colors.blue, fontSize: 12, fontWeight: '800' }, submit: { marginTop: 20 }, footerText: { color: colors.muted, textAlign: 'center', fontSize: 13 }, footerAction: { color: colors.blue, fontWeight: '800' }, terms: { color: colors.muted, textAlign: 'center', fontSize: 12, marginTop: 13 }, passwordHint: { marginTop: 15, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, flexDirection: 'row', alignItems: 'center', ...shadow.card }, hintIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F8EF', marginRight: 9 }, hintTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, hintCopy: { color: colors.muted, fontSize: 12, marginTop: 2 }, reviewStep: { marginTop: 14, backgroundColor: colors.surface, padding: 13, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', ...shadow.card }, reviewNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  errorNotice: { backgroundColor: '#FFF0F1', borderRadius: radius.sm, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 15 }, errorText: { color: '#A63038', fontSize: 12, lineHeight: 17, flex: 1, fontWeight: '600' }, sentNotice: { marginTop: 20, borderRadius: radius.md, padding: 14, backgroundColor: '#EAF8F1', flexDirection: 'row', gap: 10 }, sentText: { color: '#286649', fontSize: 12, lineHeight: 18, flex: 1 },
});
