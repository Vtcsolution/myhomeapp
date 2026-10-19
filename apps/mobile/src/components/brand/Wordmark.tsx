import { brand } from '@myhome/shared';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';

/** Brand lock-up: monogram seal + name, drawn from the brand config. */
export function Wordmark({
  tone = 'light',
  size = 'md',
}: {
  tone?: 'light' | 'dark';
  size?: 'md' | 'lg';
}) {
  const { colors } = useTheme();
  const { locale } = useLocale();
  const seal = size === 'lg' ? 48 : 36;
  const ink = tone === 'light' ? colors.onMidnight : colors.textPrimary;
  return (
    <View
      style={styles.row}
      accessibilityRole="header"
      accessibilityLabel={locale === 'ar' ? brand.name_ar : brand.name}
    >
      <View
        style={[
          styles.seal,
          { width: seal, height: seal, borderRadius: seal / 2, borderColor: colors.champagne },
        ]}
      >
        <Text
          variant="title3"
          align="center"
          style={{
            color: colors.champagne,
            fontFamily: 'Fraunces_600SemiBold',
            fontSize: seal * 0.38,
            lineHeight: seal * 0.46,
          }}
        >
          {brand.monogram}
        </Text>
      </View>
      <Text
        variant={size === 'lg' ? 'display' : 'title1'}
        style={{ color: ink, fontFamily: locale === 'ar' ? undefined : 'Fraunces_600SemiBold' }}
      >
        {locale === 'ar' ? brand.name_ar : brand.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  seal: { borderWidth: 1.25, alignItems: 'center', justifyContent: 'center' },
});
