import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  countryFlag,
  nationalNumberMaxLength,
  searchPhoneCountries,
  type PhoneCountry,
} from '../../lib/phoneCountries';
import { useLanguage } from '../../features/i18n/LanguageContext';
import { colors, radius, shadow, typography } from '../../theme/tokens';

type PhoneFieldProps = {
  label: string;
  helper?: string;
  placeholder: string;
  /** The national part only; the country prefix is rendered separately. */
  value: string;
  onChangeValue: (nationalNumber: string) => void;
  country: PhoneCountry;
  onChangeCountry: (country: PhoneCountry) => void;
};

/**
 * Phone number input split into a country selector and a national number field.
 *
 * The two halves stay separate so the prefix can be corrected without retyping
 * the number; callers compose them into a single E.164 string with `toE164`.
 */
export function PhoneField({ label, helper, placeholder, value, onChangeValue, country, onChangeCountry }: PhoneFieldProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(() => searchPhoneCountries(query), [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.phoneCountryA11y', { country: country.name })}
          onPress={() => setOpen(true)}
          style={styles.dialButton}
        >
          <Text style={styles.flag}>{countryFlag(country.iso)}</Text>
          <Text style={styles.dial}>{country.dial}</Text>
          <MaterialCommunityIcons name="chevron-down" size={15} color={colors.muted} />
        </Pressable>
        <View style={styles.divider} />
        <TextInput
          value={value}
          onChangeText={onChangeValue}
          placeholder={placeholder}
          placeholderTextColor="#7C8BA0"
          keyboardType="phone-pad"
          autoComplete="tel-national"
          maxLength={nationalNumberMaxLength(country.dial)}
          style={styles.input}
        />
      </View>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <View style={styles.sheetRoot}>
          <Pressable accessibilityLabel={t('auth.phoneCountryA11y')} style={styles.backdrop} onPress={close} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeading}>
              <Text style={styles.sheetTitle}>{t('auth.phoneCountryTitle')}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('auth.phoneCountryCloseA11y')} onPress={close} style={styles.sheetClose}>
                <MaterialCommunityIcons name="close" size={19} color={colors.ink} />
              </Pressable>
            </View>
            <View style={styles.searchRow}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.subtle} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('auth.phoneCountrySearch')}
                placeholderTextColor="#7C8BA0"
                autoCorrect={false}
                style={styles.searchInput}
              />
            </View>
            <FlatList
              data={results}
              keyExtractor={(country) => country.iso}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.list}
              ListEmptyComponent={<Text style={styles.noResults}>{t('auth.phoneCountryEmpty')}</Text>}
              renderItem={({ item }) => {
                const selected = item.iso === country.iso;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onChangeCountry(item);
                      close();
                    }}
                    style={[styles.countryRow, selected && styles.countryRowActive]}
                  >
                    <Text style={styles.countryFlag}>{countryFlag(item.iso)}</Text>
                    <View style={styles.countryCopy}>
                      <Text style={styles.countryName}>{item.name}</Text>
                      <Text style={styles.countryIso}>{item.iso}</Text>
                    </View>
                    <Text style={styles.countryDial}>{item.dial}</Text>
                    {selected ? <MaterialCommunityIcons name="check" size={18} color={colors.blue} /> : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 14 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700', marginBottom: 7 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    backgroundColor: '#E4ECF5',
    borderWidth: 1,
    borderColor: '#CDD9E7',
    borderRadius: radius.sm,
  },
  dialButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 13, paddingRight: 10, alignSelf: 'stretch' },
  flag: { fontSize: 18 },
  dial: { color: colors.ink, fontFamily: typography.bold, fontSize: 14 },
  divider: { width: 1, height: 24, backgroundColor: '#CDD9E7' },
  input: { flex: 1, paddingHorizontal: 13, color: colors.ink, fontSize: 14 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },

  sheetRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,25,48,0.35)' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 9,
    paddingBottom: 24,
    ...shadow.floating,
  },
  handle: { height: 4, width: 42, borderRadius: radius.pill, backgroundColor: '#CDD7E4', alignSelf: 'center', marginBottom: 12 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  sheetTitle: { flex: 1, color: colors.ink, fontSize: 18, letterSpacing: -0.4, fontWeight: '800' },
  sheetClose: { height: 34, width: 34, borderRadius: 11, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, minHeight: 46, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#CDD9E7', borderRadius: radius.sm },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14 },
  list: { marginTop: 12 },
  noResults: { paddingVertical: 26, textAlign: 'center', color: colors.muted, fontSize: 13.5 },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: radius.sm },
  countryRowActive: { backgroundColor: colors.blueSoft },
  countryFlag: { fontSize: 23 },
  countryCopy: { flex: 1 },
  countryName: { color: colors.ink, fontSize: 14.5, fontWeight: '600' },
  countryIso: { color: colors.subtle, fontSize: 11 },
  countryDial: { color: colors.muted, fontSize: 14, fontWeight: '600' },
});