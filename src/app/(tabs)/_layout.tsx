import { Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ColorValue } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadow } from '../../theme/tokens';
import { useSellerBadges } from '../../features/notifications/SellerBadgeContext';
import { useLanguage } from '../../features/i18n/LanguageContext';

type TabIconName = 'view-dashboard-outline' | 'clipboard-text-outline' | 'package-variant-closed' | 'message-text-outline' | 'account-circle-outline';
type SellerTabRoute = { key: string; name: string; params?: object };
type SellerTabBarProps = {
  state: { index: number; routes: SellerTabRoute[] };
  descriptors: Record<string, { options: { tabBarLabel?: unknown; title?: string; tabBarAccessibilityLabel?: string; tabBarButtonTestID?: string } }>;
  navigation: unknown;
};
type TabNavigation = {
    emit: (event: { type: 'tabPress' | 'tabLongPress'; target: string; canPreventDefault?: boolean }) => { defaultPrevented?: boolean };
    navigate: (name: string, params?: object) => void;
};

const tabIcon: Record<string, TabIconName> = {
  index: 'view-dashboard-outline',
  orders: 'clipboard-text-outline',
  products: 'package-variant-closed',
  messages: 'message-text-outline',
  profile: 'account-circle-outline',
};

export default function SellerTabsLayout() {
  const { t } = useLanguage();
  return (
    <Tabs tabBar={(props) => <SellerTabBar {...props} />} screenOptions={({ route }) => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.blue,
      tabBarInactiveTintColor: '#718096',
    })}>
      <Tabs.Screen name="index" options={{ title: t('nav.dashboard') }} />
      <Tabs.Screen name="orders" options={{ title: t('nav.orders') }} />
      <Tabs.Screen name="products" options={{ title: t('nav.products') }} />
      <Tabs.Screen name="messages" options={{ title: t('nav.messages') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile') }} />
    </Tabs>
  );
}

/**
 * The stock tab bar merges absolute left/right styles from React Navigation
 * on some Android builds.  This independent centred layer keeps a real,
 * equal margin on every screen size instead of letting that merge stretch it.
 */
function SellerTabBar({ state, descriptors, navigation }: SellerTabBarProps) {
  const { summary } = useSellerBadges();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardWidth = Math.max(0, width - 32);
  const bottomGap = Platform.select({ ios: Math.max(insets.bottom, 22), android: Math.max(insets.bottom, 18), default: 18 }) ?? 18;
  const countFor = (route: string) => route === 'orders' ? summary.orders : route === 'messages' ? summary.messages : route === 'profile' ? summary.support : 0;
  const tabNavigation = navigation as TabNavigation;

  return (
    <View pointerEvents="box-none" style={styles.tabBarLayer}>
      <View style={[styles.tabBar, { width: cardWidth, bottom: bottomGap }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
          const color = focused ? colors.blue : '#718096';
          const onPress = () => {
            const event = tabNavigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) tabNavigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={() => tabNavigation.emit({ type: 'tabLongPress', target: route.key })}
              style={styles.tabItem}
            >
              <TabIcon name={tabIcon[route.name] ?? 'view-dashboard-outline'} color={color} size={focused ? 22 : 21} count={countFor(route.name)} />
              <Text numberOfLines={1} style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TabIcon({ name, color, size, count }: { name: TabIconName; color: ColorValue; size: number; count: number }) {
  return <View style={styles.iconWrap}><MaterialCommunityIcons name={name} size={size} color={color} />{count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text></View> : null}</View>;
}

const styles = StyleSheet.create({
  tabBarLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'flex-end' },
  tabBar: { position: 'absolute', height: 68, flexDirection: 'row', alignItems: 'stretch', borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.98)', paddingHorizontal: 5, ...shadow.floating },
  tabItem: { flex: 1, minWidth: 0, paddingTop: 7, paddingBottom: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  tabLabel: { maxWidth: '100%', marginTop: 2, color: '#718096', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  tabLabelActive: { color: colors.blue },
  iconWrap: { minWidth: 26, minHeight: 26, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -7, right: -13, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E34C57', borderWidth: 1.5, borderColor: '#FFFFFF' },
  badgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
});
