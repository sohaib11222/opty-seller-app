import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius } from '../../theme/tokens';

type AppButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function AppButton({ label, onPress, variant = 'primary', icon, style, disabled }: AppButtonProps) {
  const body = (
    <View style={[styles.content, variant === 'secondary' && styles.secondary, variant === 'text' && styles.textOnly, disabled && styles.disabled]}>
      {icon}
      <Text style={[styles.label, variant !== 'primary' && styles.secondaryLabel]}>{label}</Text>
    </View>
  );

  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.pressable, style]}>
      {variant === 'primary' ? <LinearGradient colors={gradients.primary} style={styles.gradient}>{body}</LinearGradient> : body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: radius.sm, overflow: 'hidden' },
  gradient: { borderRadius: radius.sm, shadowColor: colors.blue, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.18, shadowRadius: 13, elevation: 5 },
  content: { minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderRadius: radius.sm },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: '#D8E6FA' },
  textOnly: { minHeight: 38, backgroundColor: 'transparent' },
  label: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: -0.1 },
  secondaryLabel: { color: '#0F58BD' },
  disabled: { opacity: 0.55 },
});
