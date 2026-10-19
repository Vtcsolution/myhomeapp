import { toKuwaitParts } from '@myhome/shared';
import { useLocale } from '@/providers/LocaleProvider';
import { useNow } from './useNow';

/** Time-of-day greeting in Kuwait time, e.g. "Good morning, Noura". */
export function useGreeting(fullName: string | undefined): string {
  const { t } = useLocale();
  const hour = toKuwaitParts(useNow()).hour;
  const greeting = t(
    hour < 12 ? 'greeting.morning' : hour < 17 ? 'greeting.afternoon' : 'greeting.evening',
  );
  const firstName = fullName?.trim().split(/\s+/)[0];
  return firstName ? t('greeting.withName', { greeting, name: firstName }) : greeting;
}
