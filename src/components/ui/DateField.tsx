import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadow } from '../../theme/tokens';
import { useLanguage } from '../../features/i18n/LanguageContext';

type DateFieldProps = { label: string; value?: string; onChange: (value: string) => void; minimumDate?: Date; helper?: string };

function parseDate(value?: string) { const parsed = value ? new Date(`${value}T12:00:00`) : new Date(); return Number.isNaN(parsed.getTime()) ? new Date() : parsed; }
function toIsoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

export function DateField({ label, value, onChange, minimumDate, helper }: DateFieldProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const date = useMemo(() => parseDate(value), [value]);
  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'set' && selected) onChange(toIsoDate(selected));
  };
  return <View style={styles.group}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.field}><MaterialCommunityIcons name="calendar-outline" size={19} color={colors.blue} /><Text style={[styles.value, !value && styles.placeholder]}>{value ? date.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-IE', { dateStyle: 'medium' }) : t('dateField.selectDate')}</Text><MaterialCommunityIcons name="chevron-down" size={19} color="#718096" /></Pressable>{helper ? <Text style={styles.helper}>{helper}</Text> : null}{open ? <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} minimumDate={minimumDate} onChange={handleChange} /> : null}</View>;
}

const styles = StyleSheet.create({
  group: { marginTop: 13 }, label: { color: colors.ink, fontSize: 12, fontWeight: '800', marginBottom: 6 }, field: { minHeight: 49, borderRadius: 11, paddingHorizontal: 12, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow.card }, value: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '700' }, placeholder: { color: '#7C8BA0', fontWeight: '500' }, helper: { color: colors.subtle, fontSize: 11, marginTop: 5 },
});
