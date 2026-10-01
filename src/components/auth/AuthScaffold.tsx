import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../ui/Screen';
import { BrandArtwork } from '../brand/BrandArtwork';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { colors } from '../../theme/tokens';

type AuthScaffoldProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description?: string;
  artTitle: string;
  artEyebrow: string;
  back?: boolean;
  onBack?: () => void;
  footer?: ReactNode;
}>;

export function AuthScaffold({ eyebrow, title, description, artTitle, artEyebrow, back, onBack, children, footer }: AuthScaffoldProps) {
  const { t } = useLanguage();
  return (
    <Screen contentStyle={styles.content} statusBarStyle="light" transparentStatusBar>
      <View style={styles.artWrap}>
        <BrandArtwork title={artTitle} eyebrow={artEyebrow} />
        {back ? (
          <Pressable accessibilityLabel={t('common.goBack')} onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {children}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  artWrap: { position: 'relative' },
  backButton: { position: 'absolute', left: 16, top: 50, width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  body: { paddingHorizontal: 22, paddingTop: 23 },
  eyebrow: { color: colors.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 29, lineHeight: 34, letterSpacing: -1.15, fontWeight: '800', marginTop: 7 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 9 },
  footer: { marginTop: 14 },
});
