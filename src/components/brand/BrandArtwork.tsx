import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../theme/tokens';

type BrandArtworkProps = { title: string; eyebrow: string; compact?: boolean };
const sellerLogo = require('../../../assets/brand/vista-seller-logo.png');

export function BrandArtwork({ title, eyebrow, compact = false }: BrandArtworkProps) {
  return (
    <LinearGradient colors={gradients.auth} style={[styles.art, compact && styles.compact]}>
      <View style={styles.dotOne} />
      <View style={styles.dotTwo} />
      <View style={[styles.logoPlate, compact && styles.logoPlateCompact]}>
        <Image source={sellerLogo} resizeMode="contain" style={styles.logo} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  art: { height: 214, overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  compact: { height: 176 },
  dotOne: { position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: '#8AD7FF', left: '22%', top: 24, opacity: 0.9 },
  dotTwo: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#72D8BD', right: '18%', top: 16, opacity: 0.88 },
  logoPlate: { position: 'absolute', top: 19, alignSelf: 'center', width: 152, height: 76, padding: 4, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.78)' },
  logoPlateCompact: { top: 12, width: 128, height: 64, borderRadius: 18 },
  logo: { width: '100%', height: '100%' },
  copy: { position: 'absolute', left: 22, bottom: 20 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -1 },
  eyebrow: { color: '#D8EEFF', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 4 },
});
