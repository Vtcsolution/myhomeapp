import { SendHorizontal } from '@/components/ui/icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { hapticSelection, PressableScale } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { noFocusRing } from '@/theme/direction';
import { radius, space } from '@/theme/tokens';
import { typeStyle } from '@/theme/typography';

export interface BubbleMessage {
  id: string;
  /** `mine` is the signed-in customer; `system` notes are centred. */
  side: 'mine' | 'theirs' | 'system';
  author?: string;
  text: string;
  createdAt: string;
}

/** One message. Own messages sit at the end of the line (right in English, left in Arabic). */
export function MessageBubble({ message }: { message: BubbleMessage }) {
  const { colors } = useTheme();
  const f = useFormat();
  if (message.side === 'system') {
    return (
      <View style={styles.system} accessible accessibilityLabel={message.text}>
        <Text variant="caption" tone="muted" align="center" natural>
          {message.text}
        </Text>
      </View>
    );
  }
  const mine = message.side === 'mine';
  return (
    <View
      style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}
      accessible
      accessibilityLabel={`${message.author ?? ''}: ${message.text}, ${f.time(message.createdAt)}`}
    >
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: colors.primary, borderBottomEndRadius: radius.sm / 2 }
            : {
                backgroundColor: colors.surface,
                borderColor: colors.hairline,
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderBottomStartRadius: radius.sm / 2,
              },
        ]}
      >
        {message.author ? (
          <Text
            variant="captionStrong"
            style={{ color: mine ? colors.champagne : colors.accentText }}
            numberOfLines={1}
          >
            {message.author}
          </Text>
        ) : null}
        <Text
          variant="body"
          natural
          style={{ color: mine ? colors.onPrimary : colors.textPrimary }}
        >
          {message.text}
        </Text>
        <Text
          variant="caption"
          style={[styles.time, { color: mine ? colors.onPrimary : colors.textMuted }]}
        >
          {f.date(message.createdAt, 'dayMonth')} · {f.time(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

/** Message input with a send button; trims and refuses empty text. */
export function Composer({
  placeholder,
  sendLabel,
  sending,
  onSend,
  maxLength = 1000,
}: {
  placeholder: string;
  sendLabel: string;
  sending: boolean;
  onSend: (text: string, clear: () => void) => void;
  maxLength?: number;
}) {
  const { colors } = useTheme();
  const { locale } = useLocale();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !sending;
  const send = () => {
    if (!canSend) return;
    hapticSelection();
    onSend(text.trim(), () => setText(''));
  };
  return (
    <View
      style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={maxLength}
        accessibilityLabel={placeholder}
        style={[
          styles.input,
          noFocusRing,
          typeStyle('body', locale),
          { color: colors.textPrimary },
        ]}
      />
      <PressableScale
        onPress={send}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel={sendLabel}
        accessibilityState={{ disabled: !canSend, busy: sending }}
        style={[styles.send, { backgroundColor: canSend ? colors.accent : colors.surfaceMuted }]}
      >
        <DirectionalIcon
          icon={SendHorizontal}
          size={18}
          color={canSend ? colors.onAccent : colors.textMuted}
          strokeWidth={1.75}
        />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  system: { paddingVertical: space.sm, paddingHorizontal: space.xl },
  bubbleRow: { flexDirection: 'row' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    gap: 2,
  },
  time: { opacity: 0.7, marginTop: 2 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    borderWidth: 1.25,
    borderRadius: radius.xl,
    paddingStart: space.lg,
    paddingEnd: space.xs,
    paddingVertical: space.xs,
  },
  input: { flex: 1, minWidth: 0, maxHeight: 120, paddingVertical: space.sm },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
