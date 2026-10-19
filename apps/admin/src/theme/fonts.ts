/**
 * The same licensed families as the mobile app (SIL Open Font License 1.1),
 * loaded from the installed packages: Fraunces (display), Manrope (body) and
 * IBM Plex Sans Arabic (Arabic).
 */
import fraunces400 from '@expo-google-fonts/fraunces/400Regular/Fraunces_400Regular.ttf';
import fraunces600 from '@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf';
import plex400 from '@expo-google-fonts/ibm-plex-sans-arabic/400Regular/IBMPlexSansArabic_400Regular.ttf';
import plex500 from '@expo-google-fonts/ibm-plex-sans-arabic/500Medium/IBMPlexSansArabic_500Medium.ttf';
import plex600 from '@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold/IBMPlexSansArabic_600SemiBold.ttf';
import plex700 from '@expo-google-fonts/ibm-plex-sans-arabic/700Bold/IBMPlexSansArabic_700Bold.ttf';
import manrope400 from '@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf';
import manrope500 from '@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf';
import manrope600 from '@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf';
import manrope700 from '@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf';
import { brand } from '@myhome/shared';

const faces: [family: string, url: string, weight: string][] = [
  [brand.typography.displayFamily, fraunces400, '400'],
  [brand.typography.displayFamily, fraunces600, '600'],
  [brand.typography.bodyFamily, manrope400, '400'],
  [brand.typography.bodyFamily, manrope500, '500'],
  [brand.typography.bodyFamily, manrope600, '600'],
  [brand.typography.bodyFamily, manrope700, '700'],
  [brand.typography.arabicFamily, plex400, '400'],
  [brand.typography.arabicFamily, plex500, '500'],
  [brand.typography.arabicFamily, plex600, '600'],
  [brand.typography.arabicFamily, plex700, '700'],
];

export function loadFonts(): void {
  if (typeof FontFace === 'undefined') return;
  for (const [family, url, weight] of faces) {
    const face = new FontFace(family, `url(${url})`, { weight, display: 'swap' });
    document.fonts.add(face);
    void face.load().catch(() => undefined);
  }
  const root = document.documentElement.style;
  root.setProperty('--font-display', `'${brand.typography.displayFamily}', Georgia, serif`);
  root.setProperty('--font-body', `'${brand.typography.bodyFamily}', system-ui, sans-serif`);
  root.setProperty('--font-arabic', `'${brand.typography.arabicFamily}', system-ui, sans-serif`);
}
