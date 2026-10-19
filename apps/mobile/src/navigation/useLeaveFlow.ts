import { type Href, router, useNavigation } from 'expo-router';
import { useCallback } from 'react';

/**
 * Returns to the tabs at the bottom of the current stack, then opens `href`.
 * Used when a flow is finished (e.g. a booking was placed) so Back can never
 * return into it. When the flow was opened from a link or a web reload, the
 * tabs are not in the stack and `href` is simply pushed.
 */
export function useLeaveFlow() {
  const navigation = useNavigation();
  return useCallback(
    (href: Href) => {
      const tabsAtBottom = navigation.getState()?.routes[0]?.name === '(tabs)';
      if (tabsAtBottom && router.canDismiss()) router.dismissAll();
      router.push(href);
    },
    [navigation],
  );
}
