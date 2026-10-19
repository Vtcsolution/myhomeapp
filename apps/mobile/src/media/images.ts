/**
 * Bundled, licensed photography (Unsplash License — see assets/images/sources.json).
 * Typed as `Record<MediaKey, …>`: the build fails if any key used by the data
 * layer has no image, so screens can never show a missing picture.
 */
import type { MediaKey } from '@myhome/shared';
import type { ImageProps } from 'expo-image';

type Source = ImageProps['source'];

export const mediaImages: Record<MediaKey, Source> = {
  'category.ac': require('../../assets/images/category/ac.jpg'),
  'category.cleaning': require('../../assets/images/category/cleaning.jpg'),
  'category.plumbing': require('../../assets/images/category/plumbing.jpg'),
  'category.electrical': require('../../assets/images/category/electrical.jpg'),
  'category.pest-control': require('../../assets/images/category/pest-control.jpg'),
  'category.painting': require('../../assets/images/category/painting.jpg'),
  'category.carpentry': require('../../assets/images/category/carpentry.jpg'),
  'category.appliances': require('../../assets/images/category/appliances.jpg'),
  'category.handyman': require('../../assets/images/category/handyman.jpg'),
  'category.smart-home': require('../../assets/images/category/smart-home.jpg'),
  'service.ac-cleaning': require('../../assets/images/service/ac-cleaning.jpg'),
  'service.ac-gas': require('../../assets/images/service/ac-gas.jpg'),
  'service.ac-repair': require('../../assets/images/service/ac-repair.jpg'),
  'service.ac-installation': require('../../assets/images/service/ac-installation.jpg'),
  'service.ac-central': require('../../assets/images/service/ac-central.jpg'),
  'service.cleaning-regular': require('../../assets/images/service/cleaning-regular.jpg'),
  'service.cleaning-deep': require('../../assets/images/service/cleaning-deep.jpg'),
  'service.cleaning-sofa': require('../../assets/images/service/cleaning-sofa.jpg'),
  'service.cleaning-carpet': require('../../assets/images/service/cleaning-carpet.jpg'),
  'service.cleaning-move': require('../../assets/images/service/cleaning-move.jpg'),
  'service.plumbing-leak': require('../../assets/images/service/plumbing-leak.jpg'),
  'service.plumbing-drain': require('../../assets/images/service/plumbing-drain.jpg'),
  'service.plumbing-heater': require('../../assets/images/service/plumbing-heater.jpg'),
  'service.plumbing-fixtures': require('../../assets/images/service/plumbing-fixtures.jpg'),
  'service.electrical-diagnosis': require('../../assets/images/service/electrical-diagnosis.jpg'),
  'service.electrical-lighting': require('../../assets/images/service/electrical-lighting.jpg'),
  'service.electrical-sockets': require('../../assets/images/service/electrical-sockets.jpg'),
  'service.pest-general': require('../../assets/images/service/pest-general.jpg'),
  'service.pest-termite': require('../../assets/images/service/pest-termite.jpg'),
  'service.pest-bedbug': require('../../assets/images/service/pest-bedbug.jpg'),
  'service.painting-room': require('../../assets/images/service/painting-room.jpg'),
  'service.painting-villa': require('../../assets/images/service/painting-villa.jpg'),
  'service.carpentry-assembly': require('../../assets/images/service/carpentry-assembly.jpg'),
  'service.carpentry-doors': require('../../assets/images/service/carpentry-doors.jpg'),
  'service.carpentry-kitchen': require('../../assets/images/service/carpentry-kitchen.jpg'),
  'service.appliance-repair': require('../../assets/images/service/appliance-repair.jpg'),
  'service.appliance-install': require('../../assets/images/service/appliance-install.jpg'),
  'service.handyman-tv': require('../../assets/images/service/handyman-tv.jpg'),
  'service.handyman-curtains': require('../../assets/images/service/handyman-curtains.jpg'),
  'service.handyman-hourly': require('../../assets/images/service/handyman-hourly.jpg'),
  'service.smart-cctv': require('../../assets/images/service/smart-cctv.jpg'),
  'service.smart-satellite': require('../../assets/images/service/smart-satellite.jpg'),
  'service.smart-lock': require('../../assets/images/service/smart-lock.jpg'),
  'promo.summer-ac': require('../../assets/images/promo/summer-ac.jpg'),
  'promo.deep-clean': require('../../assets/images/promo/deep-clean.jpg'),
  'promo.welcome': require('../../assets/images/promo/welcome.jpg'),
};

export const heroImages = {
  welcome: require('../../assets/images/hero/welcome.jpg') as Source,
};
