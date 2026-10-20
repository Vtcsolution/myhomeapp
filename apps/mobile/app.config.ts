import type { ExpoConfig } from 'expo/config';
import brand from '../../packages/shared/src/brand/brand.json';

/**
 * App identity comes from the shared brand config, so a rebrand is a single
 * edit (plus `python apps/mobile/scripts/build_assets.py --brand`).
 */
const config: ExpoConfig = {
  name: brand.name,
  slug: 'myhome',
  // The EAS project (@greatodeal/myhome) belongs to the greatodeal organisation.
  owner: 'greatodeal',
  scheme: 'myhome',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/brand/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: brand.palette.light.background,
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.myhome.demo',
  },
  android: {
    package: 'com.myhome.demo',
    // Starting build number. EAS Build manages it from here (eas.json:
    // appVersionSource "remote" + autoIncrement), so it is not bumped by hand.
    versionCode: 1,
    // Added by default but not used: demo data lives in app-private storage and
    // the app draws no overlays. Removed from the merged Android manifest.
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    adaptiveIcon: {
      foregroundImage: './assets/brand/adaptive-foreground.png',
      monochromeImage: './assets/brand/adaptive-monochrome.png',
      backgroundColor: brand.palette.light.primary,
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/brand/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/brand/splash-icon.png',
        imageWidth: 200,
        backgroundColor: brand.palette.light.primary,
      },
    ],
    // Layout direction is controlled by the app (instant English ⇄ Arabic switch),
    // not by the device language.
    ['expo-localization', { supportsRTL: false }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Links this app to its EAS project (EAS Build). Not a secret.
    eas: {
      projectId: 'b8fdf8c6-26f4-4491-98f6-2761434e0fc3',
    },
  },
};

export default config;
