import type { LucideIcon, LucideProps } from '@/components/ui/icons';
import { useLocale } from '@/providers/LocaleProvider';

/** Renders a direction-sensitive icon (arrows, chevrons) mirrored in RTL. */
export function DirectionalIcon({
  icon: Icon,
  style,
  ...props
}: LucideProps & { icon: LucideIcon }) {
  const { isRTL } = useLocale();
  return <Icon {...props} style={[style, isRTL ? { transform: [{ scaleX: -1 }] } : null]} />;
}
