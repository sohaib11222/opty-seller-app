import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { colors, radius, shadow } from '../../theme/tokens';

type LanguageToggleProps = {
  /** `overlay` sits on the coloured brand artwork, `header` on a light header. */
  variant?: 'overlay' | 'header';
};

/**
 * EN / IT switcher. Mirrors the Seller Website LanguageSwitcher: two pressed
 * buttons, the active language highlighted, the target language announced
 * through an accessibility label.
 */
export function LanguageToggle({ variant = 'header' }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage();
  const overlay = variant === 'overlay';

  return (
    <View
      style={[styles.group, overlay ? styles.overlayGroup : styles.headerGroup]}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('common.language')}
    >
      {(['en', 'it'] as const).map((code) => {
        const active = language === code;
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t('common.switchTo', {
              language: t(code === 'en' ? 'common.english' : 'common.italian'),
            })}
            onPress={() => setLanguage(code)}
            style={({ pressed }) => [
              styles.option,
              overlay ? styles.overlayOption : styles.headerOption,
              active && (overlay ? styles.overlayOptionActive : styles.headerOptionActive),
              pressed && !active && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.label,
                overlay && styles.overlayLabel,
                active && (overlay ? styles.overlayLabelActive : styles.headerLabelActive),
              ]}
            >
              {code.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 2, borderRadius: radius.sm },
  headerGroup: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, ...shadow.card },
  overlayGroup: { backgroundColor: 'rgba(7,32,66,0.34)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)' },
  option: { minWidth: 34, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerOption: { backgroundColor: 'transparent' },
  overlayOption: { backgroundColor: 'transparent' },
  headerOptionActive: { backgroundColor: colors.blue },
  overlayOptionActive: { backgroundColor: 'rgba(255,255,255,0.94)' },
  pressed: { opacity: 0.7 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  headerLabel: { color: colors.muted },
  headerLabelActive: { color: '#FFFFFF' },
  overlayLabel: { color: 'rgba(255,255,255,0.86)' },
  overlayLabelActive: { color: '#0B3268' },
});
