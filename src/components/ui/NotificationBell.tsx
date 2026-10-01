import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSellerBadges } from '../../features/notifications/SellerBadgeContext';
import { useLanguage } from '../../features/i18n/LanguageContext';

export function NotificationBell() {
  const { t } = useLanguage();
  const { summary } = useSellerBadges();
  const count = summary.notifications;
  return <Pressable accessibilityLabel={t('notifications.title')} onPress={() => router.push('/notifications')} style={styles.button}><MaterialCommunityIcons name="bell-outline" size={21} color="#3E5877" />{count > 0 ? <View style={styles.badge}><Text style={styles.text}>{count > 99 ? '99+' : count}</Text></View> : null}</Pressable>;
}
const styles = StyleSheet.create({ button: { height: 36, width: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, badge: { position: 'absolute', right: -5, top: -5, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E34C57', borderWidth: 2, borderColor: '#F7F9FD' }, text: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' } });
