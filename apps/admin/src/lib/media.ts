/**
 * The licensed photography bundled with the mobile app (Unsplash License —
 * apps/mobile/assets/images/sources.json), reused here so the catalogue looks
 * the same in both. Key `service.ac-cleaning` ↔ file `service/ac-cleaning.jpg`.
 */
import { type MediaKey, mediaKeys } from '@myhome/shared';

const files = import.meta.glob<string>('../../../mobile/assets/images/*/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const byKey = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const match = /images\/([^/]+)\/([^/]+)\.jpg$/.exec(path);
  if (match) byKey.set(`${match[1]}.${match[2]}`, url);
}

export function mediaUrl(key: MediaKey): string | undefined {
  return byKey.get(key);
}

/** Keys without a bundled image (should always be empty — checked by a test). */
export function missingMedia(): MediaKey[] {
  return mediaKeys.filter((key) => !byKey.has(key));
}

/** Images an admin may assign to a service (service and category photography). */
export const serviceImageChoices: MediaKey[] = mediaKeys.filter(
  (key) => key.startsWith('service.') || key.startsWith('category.'),
);
