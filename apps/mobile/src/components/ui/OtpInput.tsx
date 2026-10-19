import { type ComponentRef, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, type TextStyle, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { dirAttribute, directionStyle, noFocusRing } from '@/theme/direction';
import { radius, space } from '@/theme/tokens';
import { Text } from './Text';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
}

/**
 * One hidden input rendered as separate digit boxes. Codes are always read
 * left to right, so the row stays LTR in Arabic too.
 */
export function OtpInput({
  value,
  onChange,
  length = 4,
  error,
  disabled,
  accessibilityLabel,
}: OtpInputProps) {
  const { colors } = useTheme();
  const input = useRef<ComponentRef<typeof TextInput>>(null);

  return (
    <Pressable
      onPress={() => input.current?.focus()}
      {...dirAttribute('ltr')}
      style={[styles.row, directionStyle('ltr')]}
      accessible={false}
    >
      {Array.from({ length }, (_, i) => {
        const char = value[i] ?? '';
        const active = i === Math.min(value.length, length - 1) && !disabled;
        return (
          <View
            key={i}
            style={[
              styles.box,
              {
                backgroundColor: colors.inputBackground,
                borderColor: error ? colors.danger : active ? colors.accent : colors.border,
              },
            ]}
          >
            <Text variant="display" align="center" style={styles.digit}>
              {char}
            </Text>
          </View>
        );
      })}
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus
        editable={!disabled}
        caretHidden
        accessibilityLabel={accessibilityLabel}
        style={hiddenInput}
      />
    </Pressable>
  );
}

// Covers the boxes so taps focus the field; nearly transparent, no browser outline.
const hiddenInput: TextStyle = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  opacity: 0.011,
  ...noFocusRing,
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignSelf: 'center' },
  box: {
    width: 62,
    height: 70,
    borderRadius: radius.lg,
    borderWidth: 1.25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontFamily: 'Fraunces_600SemiBold' },
});
