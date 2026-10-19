import { type Area, type GovernorateId, getArea, searchScore } from '@myhome/shared';
import { Check, ChevronDown } from '@/components/ui/icons';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { PressableScale } from '@/components/ui/Pressable';
import { SearchField } from '@/components/ui/SearchField';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useAreas } from '@/data/queries';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Field that opens a searchable list of the selected governorate's areas. */
export function AreaPicker({
  governorateId,
  areaId,
  onChange,
  error,
}: {
  governorateId: GovernorateId | '';
  areaId: string;
  onChange: (area: Area) => void;
  error?: string | undefined;
}) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const areas = useAreas(governorateId);
  const selected = areaId ? getArea(areaId) : undefined;

  const filtered = useMemo(() => {
    const list = areas.data ?? [];
    if (!query.trim()) return list;
    return list.filter((a) => searchScore(query, [`${a.name.en} ${a.name.ar}`]) > 0);
  }, [areas.data, query]);

  const disabled = !governorateId;
  return (
    <View style={styles.wrapper}>
      <Text variant="captionStrong" tone="secondary">
        {t('addressForm.area')}
      </Text>
      <PressableScale
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityLabel={t('addressForm.area')}
        accessibilityHint={disabled ? t('addressForm.chooseGovernorate') : undefined}
        style={[
          styles.field,
          {
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.inputBackground,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <Text
          variant="body"
          tone={selected ? 'primary' : 'muted'}
          style={styles.flex}
          numberOfLines={1}
        >
          {selected
            ? f.text(selected.name)
            : disabled
              ? t('addressForm.chooseGovernorate')
              : t('addressForm.chooseArea')}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} strokeWidth={1.75} />
      </PressableScale>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}

      <Sheet visible={open} title={t('addressForm.chooseArea')} onClose={() => setOpen(false)}>
        <View style={styles.search}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('addressForm.searchArea')}
            clearLabel={t('search.clear')}
            accessibilityLabel={t('addressForm.searchArea')}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          ListEmptyComponent={
            <Text variant="callout" tone="muted" align="center" style={styles.empty}>
              {t('addressForm.noAreas')}
            </Text>
          }
          renderItem={({ item }) => {
            const isSelected = item.id === areaId;
            return (
              <PressableScale
                scaleTo={0.99}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={f.text(item.name)}
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                  setQuery('');
                }}
                style={[styles.option, { borderBottomColor: colors.hairline }]}
              >
                <Text variant="body" style={styles.flex}>
                  {f.text(item.name)}
                </Text>
                {isSelected ? <Check size={18} color={colors.accent} strokeWidth={2} /> : null}
              </PressableScale>
            );
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.25,
  },
  flex: { flex: 1 },
  search: { marginBottom: space.sm },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  empty: { paddingVertical: space.xl },
});
