import type { MediaKey } from '@myhome/shared';
import { Image, type ImageProps } from 'expo-image';
import { mediaImages } from '@/media/images';
import { useTheme } from '@/providers/ThemeProvider';

export interface PhotoProps extends Omit<ImageProps, 'source'> {
  media?: MediaKey;
  source?: ImageProps['source'];
}

/** Bundled photography with a calm placeholder colour and a short cross-fade. */
export function Photo({ media, source, style, ...rest }: PhotoProps) {
  const { colors } = useTheme();
  return (
    <Image
      source={media ? mediaImages[media] : source}
      contentFit="cover"
      transition={180}
      accessibilityIgnoresInvertColors
      {...rest}
      style={[{ backgroundColor: colors.skeleton }, style]}
    />
  );
}
