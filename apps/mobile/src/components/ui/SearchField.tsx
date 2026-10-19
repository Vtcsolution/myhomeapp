import { Search, X } from 'lucide-react-native';
import { type ComponentRef, forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { noFocusRing } from '@/theme/direction';
import { typeStyle } from '@/theme/typography';
import { PressableScale } from './Pressable';

export interface SearchFieldProps extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (value: string) => void;
  clearLabel: string;
}

/** Pill-shaped search input with a clear button. */
export const SearchField = forwardRef<ComponentRef<typeof TextInput>, SearchFieldProps>(
  function SearchField({ value, onChangeText, clearLabel, ...props }, ref) {
    const { colors } = useTheme();
    const { locale, isRTL } = useLocale();
    return (
      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textMuted} strokeWidth={1.75} style={styles.icon} />
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
          {...props}
          style={[
            styles.input,
            noFocusRing,
            typeStyle('body', locale),
            {
              color: colors.textPrimary,
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr',
            },
          ]}
        />
        {value ? (
          <PressableScale
            onPress={() => onChangeText('')}
            accessibilityLabel={clearLabel}
            hitSlop={10}
            style={[styles.clear, { backgroundColor: colors.surfaceMuted }]}
          >
            <X size={14} color={colors.textSecondary} strokeWidth={2} />
          </PressableScale>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  input: { flex: 1, minWidth: 0, height: '100%', fontSize: 16 },
  icon: { flexShrink: 0 },
  clear: {
    flexShrink: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
