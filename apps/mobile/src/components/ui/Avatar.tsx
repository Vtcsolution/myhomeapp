import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Text } from './Text';

function initials(name: string): string {
  const parts = name
    .replace(/\b(al|el)-/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Monogram avatar with a fine champagne ring. */
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.midnight,
          borderColor: colors.champagne,
        },
      ]}
    >
      <Text
        variant="title3"
        align="center"
        style={{ color: colors.champagne, fontSize: size * 0.36, lineHeight: size * 0.44 }}
      >
        {initials(name) || '·'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
});
