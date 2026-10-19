import { type ComponentRef, forwardRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { dirAttribute, directionStyle, noFocusRing } from '@/theme/direction';
import { radius, space } from '@/theme/tokens';
import { typeStyle } from '@/theme/typography';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string | null;
  /** Fixed leading text, e.g. the "+965" country code. */
  prefix?: string;
  /** Force left-to-right entry (phone numbers, emails) even in Arabic. */
  ltr?: boolean;
}

export const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(
  function TextField({ label, hint, error, prefix, ltr, onFocus, onBlur, ...inputProps }, ref) {
    const { colors } = useTheme();
    const { locale, isRTL } = useLocale();
    const [focused, setFocused] = useState(false);
    const borderColor = error ? colors.danger : focused ? colors.accent : colors.border;
    const forceLtr = ltr ?? false;

    return (
      <View style={styles.wrapper}>
        <Text variant="captionStrong" tone="secondary">
          {label}
        </Text>
        <View
          {...(forceLtr ? dirAttribute('ltr') : {})}
          style={[
            styles.field,
            { borderColor, backgroundColor: colors.inputBackground },
            forceLtr && directionStyle('ltr'),
          ]}
        >
          {prefix ? (
            <View style={[styles.prefix, { borderColor: colors.hairline }]}>
              <Text variant="bodyStrong" style={{ writingDirection: 'ltr' }}>
                {prefix}
              </Text>
            </View>
          ) : null}
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            {...inputProps}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[
              styles.input,
              noFocusRing,
              typeStyle('body', forceLtr ? 'en' : locale),
              {
                color: colors.textPrimary,
                textAlign: forceLtr ? 'left' : isRTL ? 'right' : 'left',
                writingDirection: forceLtr ? 'ltr' : isRTL ? 'rtl' : 'ltr',
              },
            ]}
          />
        </View>
        {error ? (
          <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1.25,
    overflow: 'hidden',
  },
  prefix: {
    paddingHorizontal: space.lg,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderEndWidth: 1,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: 17,
  },
});
