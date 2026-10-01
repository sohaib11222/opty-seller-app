import type { TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../../theme/tokens';

type TextFieldProps = TextInputProps & { label: string; helper?: string };

export function TextField({ label, helper, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#7C8BA0" style={styles.input} {...inputProps} />
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 14 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 50, backgroundColor: '#E4ECF5', borderWidth: 1, borderColor: '#CDD9E7', borderRadius: radius.sm, paddingHorizontal: 14, color: colors.ink, fontSize: 14 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
});
