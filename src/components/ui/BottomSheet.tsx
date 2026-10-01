import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../../theme/tokens';
import { useLanguage } from '../../features/i18n/LanguageContext';

type BottomSheetProps = { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode };

export function BottomSheet({ visible, title, subtitle, onClose, children }: BottomSheetProps) {
  const { t } = useLanguage();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.root}>
      <Pressable accessibilityLabel={t('common.closeSheet')} style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.heading}><View style={{ flex: 1 }}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View><Pressable accessibilityLabel={t('common.closeSheet')} onPress={onClose} style={styles.close}><MaterialCommunityIcons name="close" size={20} color="#3E5877" /></Pressable></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,25,48,0.35)' }, backdrop: { ...StyleSheet.absoluteFill }, sheet: { maxHeight: '86%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.background, paddingHorizontal: 20, paddingBottom: 28, paddingTop: 9, ...shadow.floating }, handle: { height: 4, width: 42, borderRadius: radius.pill, backgroundColor: '#CDD7E4', alignSelf: 'center', marginBottom: 12 }, heading: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: colors.line }, content: { paddingTop: 14 }, title: { color: colors.ink, fontSize: 18, letterSpacing: -0.4, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 }, close: { height: 36, width: 36, borderRadius: 11, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
});
