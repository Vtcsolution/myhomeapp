import { brand, formatKuwaitPhone } from '@myhome/shared';
import Constants from 'expo-constants';
import { Image as ImageIcon, Info, Mail, Phone, Type } from '@/components/ui/icons';
import { Linking, StyleSheet, View } from 'react-native';
import { Wordmark } from '@/components/brand/Wordmark';
import { SectionLabel } from '@/components/account/SettingsSections';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/Headers';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { space } from '@/theme/tokens';

export default function AboutScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <Screen header={<ScreenHeader back fallbackHref="/" title={t('about.title')} />}>
      <Card tone="midnight" style={styles.brand}>
        <Wordmark size="lg" />
        <Text variant="body" style={{ color: 'rgba(251,248,243,0.8)' }}>
          {f.text(brand.tagline)}
        </Text>
        <Text variant="caption" style={{ color: colors.champagne }}>
          {t('about.version', { version })}
        </Text>
      </Card>

      <Card tone="muted">
        <View style={styles.notice}>
          <Info size={20} color={colors.accent} strokeWidth={1.75} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">{t('about.demoTitle')}</Text>
            <Text variant="callout" tone="secondary">
              {t('about.demoBody')}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionLabel>{t('about.support')}</SectionLabel>
        <ListGroup>
          <ListRow
            icon={Phone}
            title={formatKuwaitPhone(brand.support.phone)}
            subtitle={f.text(brand.support.hours)}
            onPress={() => void Linking.openURL(`tel:${brand.support.phone}`)}
          />
          <ListRow
            icon={Mail}
            title={brand.support.email}
            onPress={() => void Linking.openURL(`mailto:${brand.support.email}`)}
          />
        </ListGroup>
      </View>

      <ListGroup>
        <ListRow
          icon={ImageIcon}
          title={t('about.photography')}
          subtitle={t('about.photographyBody')}
        />
        <ListRow icon={Type} title={t('about.typography')} subtitle={t('about.typographyBody')} />
      </ListGroup>

      <Text variant="caption" tone="muted" align="center">
        © {new Date().getFullYear()} {brand.legalName}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { gap: space.md, padding: space.xxl },
  notice: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  flex: { flex: 1, gap: space.xs },
  section: { gap: space.sm },
});
