import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StatusBar, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  backgroundColor?: string;
  statusBarStyle?: 'light' | 'dark';
  /** Lets a branded/authentication header continue behind the status bar. */
  transparentStatusBar?: boolean;
  /** Content that must stay above a scrolling page, such as a floating action button. */
  overlay?: ReactNode;
}>;

export function Screen({ children, scroll = true, style, contentStyle, backgroundColor = colors.background, statusBarStyle = 'dark', transparentStatusBar = false, overlay }: ScreenProps) {
  return (
    <View style={[styles.root, { backgroundColor }]}>
      <StatusBar animated translucent={transparentStatusBar} barStyle={statusBarStyle === 'light' ? 'light-content' : 'dark-content'} backgroundColor={transparentStatusBar ? 'transparent' : backgroundColor} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor }, style]} edges={transparentStatusBar ? ['left', 'right', 'bottom'] : ['top', 'left', 'right', 'bottom']}>
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.scrollContent, contentStyle]} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fixedContent, contentStyle]}>{children}</View>
        )}
        {overlay}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  fixedContent: { flex: 1 },
});
