import type { ExpoConfig } from 'expo/config';
import brand from '../../packages/shared/src/brand/brand.json';

/**
 * App identity comes from the shared brand config, so a rebrand is a single
 * edit (plus `python apps/mobile/scripts/build_assets.py --brand`).
 */
const config: ExpoConfig = {
  name: brand.name,
  slug: 'myhome',
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
};

export default config;
