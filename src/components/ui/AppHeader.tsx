import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../../theme/tokens';
import { MainHeaderActions } from './MainHeaderActions';
import { useSellerSidebar } from '../navigation/SellerSidebar';
import { useLanguage } from '../../features/i18n/LanguageContext';

type AppHeaderProps = {
  title: string;
  left?: ReactNode;
  right?: ReactNode | null;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  /** Render `right` next to the main header actions (bell + avatar) instead of on its own. */
  withMainActions?: boolean;
  /** Accessible name for the `right` icon button. */
  rightA11yLabel?: string;
  /** Render a short text action instead of an icon, e.g. a "Top up" shortcut. */
  actionLabel?: string;
  /** Route pushed when `actionLabel` is pressed. */
  actionHref?: Href;
};

export function AppHeader({ title, left, right, onLeftPress, onRightPress, withMainActions, rightA11yLabel, actionLabel, actionHref }: AppHeaderProps) {
  const { t } = useLanguage();
  const { openSidebar } = useSellerSidebar();
  const leftContent = left ?? <MaterialCommunityIcons name="menu" size={21} color="#3E5877" />;
  const hasActionLabel = Boolean(actionLabel);
  // Main tabs deliberately use the same two live actions. Contextual screens can
  // compose search, add or settings with these buttons when they need to.
  const rightContent = right === undefined
    ? <MainHeaderActions />
    : withMainActions
      ? <View style={styles.profileActions}>
          <Pressable accessibilityLabel={rightA11yLabel ?? t('nav.sellerSettings')} onPress={onRightPress} style={styles.iconButton}>{right}</Pressable>
          <MainHeaderActions />
        </View>
      : hasActionLabel
        ? <Text style={styles.actionLabel}>{actionLabel}</Text>
        : right;
  const rightAction = withMainActions ? undefined : hasActionLabel ? () => { if (actionHref) router.push(actionHref); } : onRightPress;
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={onLeftPress ?? openSidebar} style={styles.iconButton}>
        {leftContent}
      </Pressable>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
      {right === undefined ? rightContent : rightContent ? rightAction ? <Pressable accessibilityRole="button" onPress={rightAction} style={[styles.iconButton, hasActionLabel && styles.actionLabelButton]}>{rightContent}</Pressable> : <View style={styles.rightContent}>{rightContent}</View> : <View style={styles.iconSpacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 62, paddingHorizontal: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(222,229,239,0.8)', backgroundColor: 'rgba(247,249,253,0.96)' },
  iconButton: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, ...shadow.card },
  iconSpacer: { width: 36, height: 36 },
  rightContent: { minWidth: 36, minHeight: 36, justifyContent: 'center', alignItems: 'flex-end' },
  profileActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, textAlign: 'center', marginHorizontal: 10, color: colors.ink, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  actionLabelButton: { width: 53 }, actionLabel: { color: colors.blue, fontSize: 11, fontWeight: '800' },
});
