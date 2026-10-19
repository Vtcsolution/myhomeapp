import { useCallback } from 'react';
import type { TKey } from '@/i18n/translate';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';

type FeatureKey = Extract<TKey, `features.${string}`>;

/**
 * Temporary, clearly-labelled response for entry points whose destination is
 * built in a later stage of this project (instead of a silent dead button).
 * Every call site is listed in the stage report and replaced as stages land.
 */
export function useNextStage() {
  const { t } = useLocale();
  const { show } = useToast();
  return useCallback(
    (feature: FeatureKey, stage: number) =>
      show(t('common.nextStage', { feature: t(feature), stage })),
    [show, t],
  );
}
