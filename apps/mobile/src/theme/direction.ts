import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export type Direction = 'ltr' | 'rtl';

const isWeb = Platform.OS === 'web';

/**
 * Layout direction for a View. Native layout uses the `direction` style;
 * react-native-web has no such style and relies on the HTML `dir` attribute,
 * so both helpers are applied together:
 *   <View {...dirAttribute('ltr')} style={[styles.x, directionStyle('ltr')]} />
 */
export function directionStyle(direction: Direction): ViewStyle {
  return isWeb ? {} : { direction };
}

export function dirAttribute(direction: Direction): Record<string, string> {
  return isWeb ? { dir: direction } : {};
}

/**
 * Removes the browser's native focus ring on web text inputs (our fields draw
 * their own focus border). `outline-style: auto` ignores `outline-width`, so
 * the style itself must be `none`, a value React Native's types do not model.
 */
export const noFocusRing: TextStyle = isWeb
  ? ({ outlineStyle: 'none' } as unknown as TextStyle)
  : {};

/**
 * iPhone Safari zooms the whole page when a text field under 16 px gains
 * focus. Web inputs therefore never go below 16 px; native apps are unchanged.
 * Place it last in an input's style array.
 */
export const webInputMinFont: TextStyle = isWeb ? { fontSize: 16 } : {};
