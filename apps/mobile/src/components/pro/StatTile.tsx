import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { space } from '@/theme/tokens';

/** Key figure with a quiet label. */
export function StatTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <Card style={styles.tile}>
      <Text variant="overline" tone="muted" numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.value}>
        <Text variant="title2" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {caption ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 140, gap: space.sm },
  value: { gap: 2 },
});
