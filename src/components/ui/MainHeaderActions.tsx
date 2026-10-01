import { StyleSheet, View } from 'react-native';
import { NotificationBell } from './NotificationBell';
import { WarehouseCartButton } from './WarehouseCartButton';

/** Common action pair for every tab: cart first, notifications second. */
export function MainHeaderActions() { return <View style={styles.actions}><WarehouseCartButton /><NotificationBell /></View>; }
const styles = StyleSheet.create({ actions: { flexDirection: 'row', alignItems: 'center', gap: 8 } });
