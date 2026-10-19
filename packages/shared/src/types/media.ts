/**
 * Every image the data layer can reference. Apps map each key to a bundled,
 * licensed asset; because the map is typed as `Record<MediaKey, …>` the
 * compiler guarantees no screen can reference a missing image.
 */
export const mediaKeys = [
  'category.ac',
  'category.cleaning',
  'category.plumbing',
  'category.electrical',
  'category.pest-control',
  'category.painting',
  'category.carpentry',
  'category.appliances',
  'category.handyman',
  'category.smart-home',
  'service.ac-cleaning',
  'service.ac-gas',
  'service.ac-repair',
  'service.ac-installation',
  'service.ac-central',
  'service.cleaning-regular',
  'service.cleaning-deep',
  'service.cleaning-sofa',
  'service.cleaning-carpet',
  'service.cleaning-move',
  'service.plumbing-leak',
  'service.plumbing-drain',
  'service.plumbing-heater',
  'service.plumbing-fixtures',
  'service.electrical-diagnosis',
  'service.electrical-lighting',
  'service.electrical-sockets',
  'service.pest-general',
  'service.pest-termite',
  'service.pest-bedbug',
  'service.painting-room',
  'service.painting-villa',
  'service.carpentry-assembly',
  'service.carpentry-doors',
  'service.carpentry-kitchen',
  'service.appliance-repair',
  'service.appliance-install',
  'service.handyman-tv',
  'service.handyman-curtains',
  'service.handyman-hourly',
  'service.smart-cctv',
  'service.smart-satellite',
  'service.smart-lock',
  'promo.summer-ac',
  'promo.deep-clean',
  'promo.welcome',
] as const;

export type MediaKey = (typeof mediaKeys)[number];

/**
 * Semantic icon names for categories. Apps map these to a single professional
 * vector icon set, so data never depends on a specific icon library.
 */
export type CategoryIcon =
  | 'air-conditioner'
  | 'sparkles'
  | 'droplet'
  | 'zap'
  | 'shield-bug'
  | 'paint-roller'
  | 'hammer'
  | 'washing-machine'
  | 'wrench'
  | 'cctv';
