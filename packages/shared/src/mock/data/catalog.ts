/**
 * Demo service catalogue. Prices are realistic Kuwaiti market levels in fils.
 * Ratings and counts are left at zero here and derived from seeded bookings
 * and reviews, so every number shown in the apps is internally consistent.
 */
import type {
  LocalizedText,
  MediaKey,
  PricingModel,
  Service,
  ServiceAddOn,
  ServiceCategory,
  ServiceOptionChoice,
  ServiceOptionGroup,
} from '../../types';

const L = (en: string, ar: string): LocalizedText => ({ en, ar });

const choice = (
  id: string,
  en: string,
  ar: string,
  priceDelta = 0,
  durationDeltaMin = 0,
): ServiceOptionChoice => ({ id, label: L(en, ar), priceDelta, durationDeltaMin });

const group = (
  id: string,
  label: LocalizedText,
  choices: ServiceOptionChoice[],
  required = true,
): ServiceOptionGroup => ({ id, label, required, choices });

const addOn = (
  id: string,
  en: string,
  ar: string,
  price: number,
  durationMin: number,
): ServiceAddOn => ({
  id,
  name: L(en, ar),
  price,
  durationMin,
});

export const categories: ServiceCategory[] = [
  {
    id: 'cat-ac',
    slug: 'ac',
    name: L('AC Services', 'خدمات التكييف'),
    description: L(
      'Cleaning, gas, repair and installation by certified AC specialists.',
      'تنظيف وتعبئة غاز وإصلاح وتركيب على يد أخصائيي تكييف معتمدين.',
    ),
    icon: 'air-conditioner',
    image: 'category.ac',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'cat-cleaning',
    slug: 'cleaning',
    name: L('Home Cleaning', 'تنظيف المنازل'),
    description: L(
      'Trained, vetted cleaners for regular, deep and specialist cleaning.',
      'فرق تنظيف مدرّبة وموثوقة للتنظيف الدوري والعميق والمتخصص.',
    ),
    icon: 'sparkles',
    image: 'category.cleaning',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'cat-plumbing',
    slug: 'plumbing',
    name: L('Plumbing', 'السباكة'),
    description: L(
      'Leaks, drains, heaters and fixtures handled with care.',
      'التسربات والمجاري والسخانات والتمديدات بعناية واحتراف.',
    ),
    icon: 'droplet',
    image: 'category.plumbing',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'cat-electrical',
    slug: 'electrical',
    name: L('Electrical', 'الكهرباء'),
    description: L(
      'Safe fault-finding, lighting and wiring by licensed electricians.',
      'كشف آمن للأعطال وتركيب الإنارة والتمديدات على يد كهربائيين مرخّصين.',
    ),
    icon: 'zap',
    image: 'category.electrical',
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'cat-pest',
    slug: 'pest-control',
    name: L('Pest Control', 'مكافحة الحشرات'),
    description: L(
      'Discreet treatments with approved, low-odour products.',
      'معالجات دقيقة بمواد معتمدة وقليلة الرائحة.',
    ),
    icon: 'shield-bug',
    image: 'category.pest-control',
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 'cat-painting',
    slug: 'painting',
    name: L('Painting', 'الصباغة'),
    description: L(
      'Flawless interior finishes with premium paints and full protection.',
      'تشطيبات داخلية متقنة بدهانات فاخرة مع حماية كاملة للأثاث.',
    ),
    icon: 'paint-roller',
    image: 'category.painting',
    sortOrder: 6,
    isActive: true,
  },
  {
    id: 'cat-carpentry',
    slug: 'carpentry',
    name: L('Carpentry', 'النجارة'),
    description: L(
      'Furniture assembly, doors, locks and kitchen cabinet repairs.',
      'تركيب الأثاث وإصلاح الأبواب والأقفال وخزائن المطبخ.',
    ),
    icon: 'hammer',
    image: 'category.carpentry',
    sortOrder: 7,
    isActive: true,
  },
  {
    id: 'cat-appliances',
    slug: 'appliances',
    name: L('Appliances', 'الأجهزة المنزلية'),
    description: L(
      'Repair and installation for all major home appliances.',
      'إصلاح وتركيب جميع الأجهزة المنزلية الرئيسية.',
    ),
    icon: 'washing-machine',
    image: 'category.appliances',
    sortOrder: 8,
    isActive: true,
  },
  {
    id: 'cat-handyman',
    slug: 'handyman',
    name: L('Handyman', 'الصيانة العامة'),
    description: L(
      'TV mounting, curtains and the small jobs that make a home.',
      'تركيب التلفزيونات والستائر والأعمال الصغيرة التي تكمل منزلك.',
    ),
    icon: 'wrench',
    image: 'category.handyman',
    sortOrder: 9,
    isActive: true,
  },
  {
    id: 'cat-smart-home',
    slug: 'smart-home',
    name: L('Smart Home & CCTV', 'المنزل الذكي والكاميرات'),
    description: L(
      'Cameras, smart locks and satellite set-up, professionally configured.',
      'كاميرات وأقفال ذكية وستلايت بإعداد احترافي متكامل.',
    ),
    icon: 'cctv',
    image: 'category.smart-home',
    sortOrder: 10,
    isActive: true,
  },
];

interface ServiceSeed {
  id: string;
  categoryId: string;
  name: LocalizedText;
  short: LocalizedText;
  description: LocalizedText;
  image: MediaKey;
  pricingModel: PricingModel;
  basePrice: number;
  unitLabel?: LocalizedText;
  minUnits?: number;
  maxUnits?: number;
  durationMin: number;
  optionGroups?: ServiceOptionGroup[];
  addOns?: ServiceAddOn[];
  includes: LocalizedText[];
  excludes?: LocalizedText[];
  warrantyDays: number;
  isPopular?: boolean;
}

const UNITS = {
  acUnit: L('per AC unit', 'لكل وحدة تكييف'),
  hour: L('per hour', 'لكل ساعة'),
  seat: L('per seat', 'لكل مقعد'),
  sqm: L('per m²', 'لكل متر مربع'),
  heater: L('per heater', 'لكل سخان'),
  fixture: L('per fixture', 'لكل قطعة'),
  point: L('per point', 'لكل نقطة'),
  room: L('per room', 'لكل غرفة'),
  item: L('per item', 'لكل قطعة'),
  appliance: L('per appliance', 'لكل جهاز'),
  tv: L('per TV', 'لكل تلفزيون'),
  window: L('per window', 'لكل نافذة'),
  camera: L('per camera', 'لكل كاميرا'),
};

const inspectionNote = L(
  'The visit fee covers a full diagnosis. Your technician then quotes any repair in the app for your approval — nothing is done without your consent.',
  'تغطي رسوم الزيارة التشخيص الكامل، ثم يرسل لك الفني عرض سعر الإصلاح عبر التطبيق لتوافق عليه — لا يتم أي عمل دون موافقتك.',
);

const sizeChoices = (prefix: string, base: number, durations: [number, number, number]) => [
  choice(`${prefix}-apartment`, 'Apartment', 'شقة', 0, 0),
  choice(`${prefix}-villa`, 'Villa', 'فيلا', base, durations[1]),
  choice(
    `${prefix}-large-villa`,
    'Large villa (3+ floors)',
    'فيلا كبيرة (3 أدوار أو أكثر)',
    base * 2,
    durations[2],
  ),
];

const serviceSeeds: ServiceSeed[] = [
  // ── AC ──
  {
    id: 'svc-ac-cleaning',
    categoryId: 'cat-ac',
    name: L('AC Deep Cleaning', 'تنظيف المكيفات العميق'),
    short: L(
      'Coil, filter and drain cleaning for cooler, fresher air.',
      'تنظيف الملف والفلاتر ومجرى التصريف لهواء أنقى وتبريد أفضل.',
    ),
    description: L(
      "Kuwait's dust and heat take a toll on every AC. Our specialists pressure-clean the coils, wash the filters and sanitise the drain pan so your unit cools faster and uses less power.",
      'يؤثر غبار الكويت وحرارتها على كل مكيف. يقوم أخصائيونا بتنظيف الملفات بالضغط وغسل الفلاتر وتعقيم حوض التصريف ليبرد المكيف بسرعة أكبر ويستهلك طاقة أقل.',
    ),
    image: 'service.ac-cleaning',
    pricingModel: 'per_unit',
    basePrice: 8_000,
    unitLabel: UNITS.acUnit,
    minUnits: 1,
    maxUnits: 12,
    durationMin: 45,
    optionGroups: [
      group('ac-type', L('AC type', 'نوع المكيف'), [
        choice('split', 'Split unit', 'سبليت', 0, 0),
        choice('window', 'Window unit', 'شباك', -2_000, -10),
        choice('cassette', 'Ceiling cassette', 'كاسيت سقفي', 4_000, 15),
        choice('floor', 'Floor-standing', 'دولابي', 2_000, 10),
      ]),
    ],
    addOns: [
      addOn(
        'anti-bacterial',
        'Anti-bacterial coil treatment',
        'معالجة الملف المضادة للبكتيريا',
        2_000,
        15,
      ),
      addOn('drain-flush', 'Drain line flush', 'تنظيف خط التصريف', 1_500, 10),
    ],
    includes: [
      L('Filter wash and dry', 'غسل الفلاتر وتجفيفها'),
      L('Coil pressure-cleaning', 'تنظيف الملف بالضغط'),
      L('Drain pan sanitising', 'تعقيم حوض التصريف'),
      L('Cooling performance check', 'فحص كفاءة التبريد'),
    ],
    excludes: [L('Gas refill', 'تعبئة الغاز'), L('Spare parts', 'قطع الغيار')],
    warrantyDays: 30,
    isPopular: true,
  },
  {
    id: 'svc-ac-gas',
    categoryId: 'cat-ac',
    name: L('AC Gas Refill', 'تعبئة غاز المكيف'),
    short: L(
      'Precise refrigerant top-up to manufacturer spec.',
      'تعبئة دقيقة لغاز التبريد وفق مواصفات الشركة المصنعة.',
    ),
    description: L(
      'We pressure-test the system, then top up the refrigerant to the exact level your unit needs, restoring full cooling power.',
      'نختبر ضغط النظام ثم نعبئ غاز التبريد بالمستوى الدقيق الذي يحتاجه المكيف لاستعادة قوة التبريد الكاملة.',
    ),
    image: 'service.ac-gas',
    pricingModel: 'per_unit',
    basePrice: 12_000,
    unitLabel: UNITS.acUnit,
    minUnits: 1,
    maxUnits: 8,
    durationMin: 60,
    optionGroups: [
      group('gas-type', L('Refrigerant', 'نوع الغاز'), [
        choice('r410a', 'R410A', 'R410A', 0, 0),
        choice('r32', 'R32', 'R32', 1_000, 0),
        choice('r22', 'R22', 'R22', 3_000, 0),
      ]),
    ],
    addOns: [addOn('leak-test', 'Electronic leak test', 'فحص التسرب الإلكتروني', 3_000, 20)],
    includes: [
      L('System pressure test', 'اختبار ضغط النظام'),
      L('Refrigerant top-up', 'تعبئة غاز التبريد'),
      L('Outlet temperature check', 'قياس حرارة الهواء الخارج'),
    ],
    excludes: [L('Leak repair and welding', 'إصلاح التسرب واللحام')],
    warrantyDays: 60,
    isPopular: true,
  },
  {
    id: 'svc-ac-repair',
    categoryId: 'cat-ac',
    name: L('AC Repair & Diagnosis', 'تشخيص وإصلاح المكيفات'),
    short: L(
      'Not cooling, leaking or noisy? We find the cause.',
      'لا يبرد أو يسرب أو مزعج؟ نكتشف السبب.',
    ),
    description: inspectionNote,
    image: 'service.ac-repair',
    pricingModel: 'inspection',
    basePrice: 5_000,
    durationMin: 60,
    optionGroups: [
      group('ac-type', L('AC type', 'نوع المكيف'), [
        choice('split', 'Split unit', 'سبليت'),
        choice('window', 'Window unit', 'شباك'),
        choice('central', 'Central / ducted', 'مركزي'),
      ]),
    ],
    includes: [
      L('Full diagnosis', 'تشخيص كامل'),
      L('Written repair quote in the app', 'عرض سعر مكتوب في التطبيق'),
      L('Minor adjustments', 'التعديلات البسيطة'),
    ],
    excludes: [L('Spare parts (quoted separately)', 'قطع الغيار (تُسعّر بشكل منفصل)')],
    warrantyDays: 90,
  },
  {
    id: 'svc-ac-installation',
    categoryId: 'cat-ac',
    name: L('Split AC Installation', 'تركيب مكيف سبليت'),
    short: L(
      'Clean, level installation with vacuum-tested piping.',
      'تركيب نظيف ومتقن مع اختبار التفريغ للأنابيب.',
    ),
    description: L(
      'Professional installation of your new split unit, including mounting, piping, vacuum testing and commissioning.',
      'تركيب احترافي لمكيفك السبليت الجديد يشمل التثبيت والتمديدات واختبار التفريغ والتشغيل.',
    ),
    image: 'service.ac-installation',
    pricingModel: 'per_unit',
    basePrice: 25_000,
    unitLabel: UNITS.acUnit,
    minUnits: 1,
    maxUnits: 6,
    durationMin: 120,
    optionGroups: [
      group('capacity', L('Capacity', 'السعة'), [
        choice('1-5-ton', '1.5 ton', '1.5 طن', 0, 0),
        choice('2-ton', '2 ton', '2 طن', 3_000, 15),
        choice('3-ton', '2.5 – 3 ton', '2.5 – 3 طن', 6_000, 30),
      ]),
    ],
    addOns: [
      addOn('bracket', 'Outdoor wall bracket', 'حامل جداري للوحدة الخارجية', 6_000, 15),
      addOn('removal', 'Remove old unit', 'فك المكيف القديم', 7_000, 45),
      addOn('extra-pipe', 'Extra copper piping (3 m)', 'أنابيب نحاس إضافية (3 م)', 9_000, 20),
    ],
    includes: [
      L('Indoor and outdoor mounting', 'تثبيت الوحدتين الداخلية والخارجية'),
      L('Up to 3 m piping', 'أنابيب حتى 3 أمتار'),
      L('Vacuum test and commissioning', 'اختبار التفريغ والتشغيل'),
    ],
    excludes: [L('The AC unit itself', 'جهاز المكيف نفسه')],
    warrantyDays: 180,
  },
  {
    id: 'svc-ac-central',
    categoryId: 'cat-ac',
    name: L('Central AC Maintenance', 'صيانة التكييف المركزي'),
    short: L(
      'Full service for ducted and package systems.',
      'صيانة شاملة لأنظمة التكييف المركزي والمجاري الهوائية.',
    ),
    description: L(
      'A comprehensive service for villas and offices: compressor checks, coil cleaning, filter replacement and thermostat calibration.',
      'صيانة شاملة للفلل والمكاتب: فحص الضاغط وتنظيف الملفات وتبديل الفلاتر ومعايرة الثرموستات.',
    ),
    image: 'service.ac-central',
    pricingModel: 'fixed',
    basePrice: 35_000,
    durationMin: 180,
    optionGroups: [
      group('system-size', L('System size', 'حجم النظام'), [
        choice('up-to-5', 'Up to 5 tons', 'حتى 5 أطنان', 0, 0),
        choice('5-10', '5 – 10 tons', '5 – 10 أطنان', 20_000, 90),
        choice('10-plus', 'Over 10 tons', 'أكثر من 10 أطنان', 45_000, 180),
      ]),
    ],
    addOns: [
      addOn('duct-sanitising', 'Duct sanitising', 'تعقيم مجاري الهواء', 25_000, 120),
      addOn('thermostat', 'Smart thermostat replacement', 'تبديل الثرموستات الذكي', 18_000, 30),
    ],
    includes: [
      L('Compressor and fan checks', 'فحص الضاغط والمراوح'),
      L('Coil cleaning', 'تنظيف الملفات'),
      L('Filter replacement', 'تبديل الفلاتر'),
    ],
    warrantyDays: 60,
  },
  // ── Cleaning ──
  {
    id: 'svc-cleaning-regular',
    categoryId: 'cat-cleaning',
    name: L('Regular Home Cleaning', 'التنظيف المنزلي الدوري'),
    short: L('Trusted cleaners, booked by the hour.', 'عاملات تنظيف موثوقات بالساعة.'),
    description: L(
      'Dusting, vacuuming, mopping, kitchen and bathroom cleaning — your home kept immaculate on your schedule.',
      'إزالة الغبار والكنس والمسح وتنظيف المطبخ والحمامات — منزلك مرتب دائماً وفق جدولك.',
    ),
    image: 'service.cleaning-regular',
    pricingModel: 'hourly',
    basePrice: 3_500,
    unitLabel: UNITS.hour,
    minUnits: 2,
    maxUnits: 8,
    durationMin: 60,
    optionGroups: [
      group('cleaners', L('Number of cleaners', 'عدد العاملات'), [
        choice('one', '1 cleaner', 'عاملة واحدة', 0, 0),
        choice('two', '2 cleaners', 'عاملتان', 3_500, 0),
        choice('three', '3 cleaners', '3 عاملات', 7_000, 0),
      ]),
    ],
    addOns: [
      addOn('materials', 'Cleaning materials & equipment', 'مواد ومعدات التنظيف', 2_000, 0),
      addOn('ironing', 'Ironing (1 hour)', 'كي الملابس (ساعة)', 3_000, 60),
    ],
    includes: [
      L('All rooms dusted and vacuumed', 'إزالة الغبار وكنس جميع الغرف'),
      L('Kitchen surfaces', 'أسطح المطبخ'),
      L('Bathrooms', 'الحمامات'),
    ],
    warrantyDays: 0,
    isPopular: true,
  },
  {
    id: 'svc-cleaning-deep',
    categoryId: 'cat-cleaning',
    name: L('Deep Home Cleaning', 'التنظيف العميق للمنزل'),
    short: L(
      'Top-to-bottom cleaning, inside every cabinet.',
      'تنظيف شامل من الأعلى للأسفل وداخل كل خزانة.',
    ),
    description: L(
      'A meticulous, team-based clean: degreased kitchen, descaled bathrooms, scrubbed floors and the corners regular cleaning never reaches.',
      'تنظيف دقيق بفريق متكامل: إزالة الدهون من المطبخ وإزالة الترسبات من الحمامات وتنظيف الأرضيات والزوايا التي لا يصلها التنظيف العادي.',
    ),
    image: 'service.cleaning-deep',
    pricingModel: 'fixed',
    basePrice: 45_000,
    durationMin: 300,
    optionGroups: [
      group('property-size', L('Property size', 'حجم العقار'), [
        choice('apt-small', 'Apartment, 1–2 bedrooms', 'شقة، 1–2 غرفة نوم', 0, 0),
        choice('apt-large', 'Apartment, 3–4 bedrooms', 'شقة، 3–4 غرف نوم', 20_000, 120),
        choice('villa-floor', 'Villa, one floor', 'فيلا، دور واحد', 45_000, 180),
        choice('villa-full', 'Full villa', 'فيلا كاملة', 95_000, 360),
      ]),
    ],
    addOns: [
      addOn('oven', 'Oven deep clean', 'تنظيف الفرن العميق', 6_000, 45),
      addOn('fridge', 'Fridge clean', 'تنظيف الثلاجة', 5_000, 30),
      addOn('windows', 'Exterior windows & balcony', 'النوافذ الخارجية والبلكونة', 8_000, 60),
    ],
    includes: [
      L('Kitchen degreasing', 'إزالة دهون المطبخ'),
      L('Bathroom descaling', 'إزالة ترسبات الحمامات'),
      L('Inside cabinets and wardrobes', 'داخل الخزائن والدواليب'),
      L('Floor scrubbing', 'تنظيف الأرضيات بالآلة'),
    ],
    warrantyDays: 2,
    isPopular: true,
  },
  {
    id: 'svc-cleaning-sofa',
    categoryId: 'cat-cleaning',
    name: L('Sofa & Upholstery Cleaning', 'تنظيف الكنب والمفروشات'),
    short: L(
      'Hot-water extraction that revives fabric and leather.',
      'تنظيف بالبخار والاستخلاص يعيد الحياة للقماش والجلد.',
    ),
    description: L(
      'Deep extraction cleaning removes dust, allergens and stains while protecting delicate upholstery.',
      'يزيل التنظيف بالاستخلاص العميق الغبار ومسببات الحساسية والبقع مع حماية المفروشات الحساسة.',
    ),
    image: 'service.cleaning-sofa',
    pricingModel: 'per_unit',
    basePrice: 4_000,
    unitLabel: UNITS.seat,
    minUnits: 3,
    maxUnits: 20,
    durationMin: 15,
    optionGroups: [
      group('material', L('Material', 'الخامة'), [
        choice('fabric', 'Fabric', 'قماش', 0, 0),
        choice('leather', 'Leather', 'جلد', 1_000, 5),
      ]),
    ],
    addOns: [
      addOn('protector', 'Fabric protector coating', 'طبقة حماية للقماش', 5_000, 20),
      addOn('stains', 'Intensive stain treatment', 'معالجة مكثفة للبقع', 3_000, 15),
    ],
    includes: [
      L('Vacuum and pre-treatment', 'الكنس والمعالجة المسبقة'),
      L('Hot-water extraction', 'الاستخلاص بالماء الساخن'),
    ],
    warrantyDays: 0,
  },
  {
    id: 'svc-cleaning-carpet',
    categoryId: 'cat-cleaning',
    name: L('Carpet & Rug Cleaning', 'تنظيف السجاد'),
    short: L(
      'Gentle care for machine-made and hand-woven rugs.',
      'عناية لطيفة بالسجاد الآلي واليدوي.',
    ),
    description: L(
      'Specialist cleaning matched to the fibre, from everyday carpets to hand-knotted heirlooms.',
      'تنظيف متخصص يناسب نوع الألياف، من السجاد اليومي إلى السجاد اليدوي الثمين.',
    ),
    image: 'service.cleaning-carpet',
    pricingModel: 'per_unit',
    basePrice: 1_500,
    unitLabel: UNITS.sqm,
    minUnits: 4,
    maxUnits: 60,
    durationMin: 6,
    optionGroups: [
      group('carpet-type', L('Carpet type', 'نوع السجاد'), [
        choice('machine', 'Machine-made', 'سجاد آلي', 0, 0),
        choice('handmade', 'Hand-made or silk', 'يدوي أو حرير', 1_500, 6),
      ]),
    ],
    addOns: [addOn('pickup', 'Pick-up & return', 'الاستلام والتوصيل', 4_000, 0)],
    includes: [
      L('Dust extraction', 'استخلاص الغبار'),
      L('Fibre-safe shampoo', 'شامبو آمن للألياف'),
    ],
    warrantyDays: 0,
  },
  {
    id: 'svc-cleaning-move',
    categoryId: 'cat-cleaning',
    name: L('Move-in / Move-out Cleaning', 'تنظيف قبل السكن وبعده'),
    short: L(
      'Hand over or move in to a spotless home.',
      'سلّم منزلك أو انتقل إليه وهو في أبهى صورة.',
    ),
    description: L(
      'An empty-property clean covering every surface, fixture and cupboard, ready for keys to change hands.',
      'تنظيف شامل للعقار الفارغ يغطي كل الأسطح والتجهيزات والخزائن، جاهز للتسليم.',
    ),
    image: 'service.cleaning-move',
    pricingModel: 'fixed',
    basePrice: 60_000,
    durationMin: 360,
    optionGroups: [
      group(
        'property-size',
        L('Property size', 'حجم العقار'),
        sizeChoices('move', 45_000, [0, 180, 360]),
      ),
    ],
    addOns: [
      addOn(
        'construction-dust',
        'Post-construction dust removal',
        'إزالة غبار ما بعد البناء',
        20_000,
        120,
      ),
    ],
    includes: [
      L('Every room, empty', 'جميع الغرف فارغة'),
      L('Inside all cabinets', 'داخل جميع الخزائن'),
      L('Windows and frames', 'النوافذ والإطارات'),
    ],
    warrantyDays: 2,
  },
  // ── Plumbing ──
  {
    id: 'svc-plumbing-leak',
    categoryId: 'cat-plumbing',
    name: L('Leak Detection & Repair', 'كشف وإصلاح التسربات'),
    short: L('Thermal and acoustic detection — no guesswork.', 'كشف حراري وصوتي دقيق — بلا تخمين.'),
    description: inspectionNote,
    image: 'service.plumbing-leak',
    pricingModel: 'inspection',
    basePrice: 7_000,
    durationMin: 60,
    optionGroups: [
      group('location', L('Where is the leak?', 'أين التسرب؟'), [
        choice('bathroom', 'Bathroom', 'الحمام'),
        choice('kitchen', 'Kitchen', 'المطبخ'),
        choice('roof-tank', 'Roof or water tank', 'السطح أو خزان الماء'),
        choice('unsure', 'Not sure', 'غير متأكد'),
      ]),
    ],
    includes: [
      L('Thermal camera inspection', 'فحص بالكاميرا الحرارية'),
      L('Repair quote in the app', 'عرض سعر الإصلاح في التطبيق'),
    ],
    warrantyDays: 90,
    isPopular: true,
  },
  {
    id: 'svc-plumbing-drain',
    categoryId: 'cat-plumbing',
    name: L('Drain Unblocking', 'تسليك المجاري'),
    short: L(
      'Fast, clean unblocking for sinks, toilets and drains.',
      'تسليك سريع ونظيف للمغاسل والمراحيض والمجاري.',
    ),
    description: L(
      'Professional equipment clears the blockage at its source, followed by a flow test.',
      'معدات احترافية تزيل الانسداد من مصدره، يليها اختبار لتدفق المياه.',
    ),
    image: 'service.plumbing-drain',
    pricingModel: 'fixed',
    basePrice: 10_000,
    durationMin: 60,
    optionGroups: [
      group('drain-location', L('Location', 'الموقع'), [
        choice('sink', 'Sink or basin', 'مغسلة'),
        choice('toilet', 'Toilet', 'مرحاض', 2_000, 15),
        choice('floor-drain', 'Floor drain', 'صفاية أرضية'),
        choice('main-line', 'Main line', 'الخط الرئيسي', 12_000, 60),
      ]),
    ],
    includes: [L('Blockage removal', 'إزالة الانسداد'), L('Flow test', 'اختبار التدفق')],
    warrantyDays: 30,
  },
  {
    id: 'svc-plumbing-heater',
    categoryId: 'cat-plumbing',
    name: L('Water Heater Installation', 'تركيب سخان مياه'),
    short: L('Safe installation with pressure valve check.', 'تركيب آمن مع فحص صمام الضغط.'),
    description: L(
      'Installation of your new water heater including connections, safety valve check and first heat-up.',
      'تركيب سخان المياه الجديد شاملاً التوصيلات وفحص صمام الأمان والتشغيل الأول.',
    ),
    image: 'service.plumbing-heater',
    pricingModel: 'per_unit',
    basePrice: 12_000,
    unitLabel: UNITS.heater,
    minUnits: 1,
    maxUnits: 4,
    durationMin: 90,
    optionGroups: [
      group('heater-capacity', L('Capacity', 'السعة'), [
        choice('50l', '50 litres', '50 لتر'),
        choice('80l', '80 litres', '80 لتر', 2_000, 0),
        choice('100l', '100 litres', '100 لتر', 4_000, 15),
      ]),
    ],
    addOns: [
      addOn('remove-old', 'Remove old heater', 'فك السخان القديم', 3_000, 20),
      addOn('safety-valve', 'New safety valve', 'صمام أمان جديد', 2_500, 10),
    ],
    includes: [
      L('Mounting and connections', 'التثبيت والتوصيلات'),
      L('Leak and pressure test', 'اختبار التسرب والضغط'),
    ],
    excludes: [L('The heater itself', 'السخان نفسه')],
    warrantyDays: 90,
  },
  {
    id: 'svc-plumbing-fixtures',
    categoryId: 'cat-plumbing',
    name: L('Tap & Mixer Installation', 'تركيب الحنفيات والخلاطات'),
    short: L(
      'Precise fitting for taps, mixers and sprays.',
      'تركيب دقيق للحنفيات والخلاطات والشطافات.',
    ),
    description: L(
      'Supply-line connection, sealing and leak testing for every fixture.',
      'توصيل خطوط المياه والعزل واختبار التسرب لكل قطعة.',
    ),
    image: 'service.plumbing-fixtures',
    pricingModel: 'per_unit',
    basePrice: 5_000,
    unitLabel: UNITS.fixture,
    minUnits: 1,
    maxUnits: 10,
    durationMin: 30,
    optionGroups: [
      group('fixture-type', L('Fixture', 'نوع القطعة'), [
        choice('basin', 'Basin tap', 'حنفية مغسلة'),
        choice('kitchen', 'Kitchen mixer', 'خلاط مطبخ', 1_000, 10),
        choice('shower', 'Shower mixer', 'خلاط دش', 2_000, 15),
        choice('bidet', 'Bidet spray', 'شطاف'),
      ]),
    ],
    includes: [L('Fitting and sealing', 'التركيب والعزل'), L('Leak test', 'اختبار التسرب')],
    warrantyDays: 30,
  },
  // ── Electrical ──
  {
    id: 'svc-electrical-diagnosis',
    categoryId: 'cat-electrical',
    name: L('Electrical Fault Finding', 'كشف الأعطال الكهربائية'),
    short: L(
      'Tripping breakers, dead sockets, flickering lights.',
      'فصل القواطع، أفياش لا تعمل، إنارة متقطعة.',
    ),
    description: inspectionNote,
    image: 'service.electrical-diagnosis',
    pricingModel: 'inspection',
    basePrice: 6_000,
    durationMin: 60,
    optionGroups: [
      group('issue', L('What is happening?', 'ما المشكلة؟'), [
        choice('tripping', 'Breaker keeps tripping', 'القاطع يفصل باستمرار'),
        choice('no-power', 'No power in an area', 'انقطاع الكهرباء عن جزء من المنزل'),
        choice('flicker', 'Flickering lights', 'إنارة متقطعة'),
        choice('other', 'Something else', 'مشكلة أخرى'),
      ]),
    ],
    includes: [
      L('Circuit testing', 'فحص الدوائر'),
      L('Safety inspection', 'فحص السلامة'),
      L('Repair quote in the app', 'عرض سعر الإصلاح في التطبيق'),
    ],
    warrantyDays: 90,
  },
  {
    id: 'svc-electrical-lighting',
    categoryId: 'cat-electrical',
    name: L('Light Fixture Installation', 'تركيب الإنارة'),
    short: L('From spotlights to statement chandeliers.', 'من السبوت لايت إلى الثريات الفاخرة.'),
    description: L(
      'Safe installation of ceiling lights, pendants and chandeliers, with secure mounting and testing.',
      'تركيب آمن لإنارة السقف والمعلقات والثريات مع تثبيت محكم واختبار.',
    ),
    image: 'service.electrical-lighting',
    pricingModel: 'per_unit',
    basePrice: 3_500,
    unitLabel: UNITS.fixture,
    minUnits: 1,
    maxUnits: 30,
    durationMin: 20,
    optionGroups: [
      group('fixture', L('Fixture type', 'نوع الإنارة'), [
        choice('spot', 'Ceiling or spot light', 'إنارة سقف أو سبوت'),
        choice('pendant', 'Pendant', 'إنارة معلقة', 2_000, 15),
        choice('chandelier', 'Chandelier', 'ثريا', 12_000, 60),
      ]),
    ],
    addOns: [addOn('dimmer', 'Dimmer switch', 'مفتاح تحكم بالإضاءة', 6_000, 20)],
    includes: [L('Mounting and wiring', 'التثبيت والتوصيل'), L('Testing', 'الاختبار')],
    warrantyDays: 90,
  },
  {
    id: 'svc-electrical-sockets',
    categoryId: 'cat-electrical',
    name: L('Sockets & Switches', 'الأفياش والمفاتيح'),
    short: L(
      'Replace or add sockets and switches safely.',
      'تبديل أو إضافة الأفياش والمفاتيح بأمان.',
    ),
    description: L(
      'Replacement of worn sockets and switches, or new points with concealed wiring.',
      'تبديل الأفياش والمفاتيح التالفة أو إضافة نقاط جديدة بتمديدات مخفية.',
    ),
    image: 'service.electrical-sockets',
    pricingModel: 'per_unit',
    basePrice: 2_500,
    unitLabel: UNITS.point,
    minUnits: 1,
    maxUnits: 30,
    durationMin: 15,
    optionGroups: [
      group('socket-job', L('Job', 'نوع العمل'), [
        choice('replace', 'Replace existing', 'تبديل نقطة موجودة'),
        choice('new', 'New point with wiring', 'نقطة جديدة مع تمديد', 6_000, 45),
      ]),
    ],
    includes: [L('Safe isolation', 'عزل آمن للكهرباء'), L('Testing', 'الاختبار')],
    warrantyDays: 90,
  },
  // ── Pest control ──
  {
    id: 'svc-pest-general',
    categoryId: 'cat-pest',
    name: L('General Pest Control', 'مكافحة الحشرات العامة'),
    short: L(
      'Cockroaches, ants and spiders — with a 90-day guarantee.',
      'الصراصير والنمل والعناكب — مع ضمان 90 يوماً.',
    ),
    description: L(
      'Targeted gel and spray treatment of kitchens, bathrooms and entry points using approved, low-odour products.',
      'معالجة مركزة بالجل والرش للمطابخ والحمامات ونقاط الدخول باستخدام مواد معتمدة وقليلة الرائحة.',
    ),
    image: 'service.pest-general',
    pricingModel: 'fixed',
    basePrice: 25_000,
    durationMin: 90,
    optionGroups: [
      group(
        'property-size',
        L('Property size', 'حجم العقار'),
        sizeChoices('pest', 15_000, [0, 60, 120]),
      ),
    ],
    addOns: [
      addOn('follow-up', 'Follow-up visit after 14 days', 'زيارة متابعة بعد 14 يوماً', 10_000, 60),
    ],
    includes: [
      L('Inspection', 'الفحص'),
      L('Gel and spray treatment', 'المعالجة بالجل والرش'),
      L('Prevention advice', 'نصائح الوقاية'),
    ],
    warrantyDays: 90,
    isPopular: true,
  },
  {
    id: 'svc-pest-termite',
    categoryId: 'cat-pest',
    name: L('Termite Inspection & Treatment', 'فحص ومعالجة النمل الأبيض'),
    short: L(
      'Protect wood and foundations from termites.',
      'احمِ الأخشاب والأساسات من النمل الأبيض.',
    ),
    description: inspectionNote,
    image: 'service.pest-termite',
    pricingModel: 'inspection',
    basePrice: 10_000,
    durationMin: 60,
    includes: [
      L('Moisture and wood inspection', 'فحص الرطوبة والأخشاب'),
      L('Treatment plan and quote', 'خطة معالجة وعرض سعر'),
    ],
    warrantyDays: 365,
  },
  {
    id: 'svc-pest-bedbug',
    categoryId: 'cat-pest',
    name: L('Bed Bug Treatment', 'مكافحة بق الفراش'),
    short: L('Discreet, thorough two-stage treatment.', 'معالجة دقيقة وشاملة على مرحلتين.'),
    description: L(
      'Mattresses, frames and soft furnishings are treated, with a second visit included to break the life cycle.',
      'معالجة المراتب والأسرّة والمفروشات مع زيارة ثانية مشمولة لقطع دورة حياة الحشرة.',
    ),
    image: 'service.pest-bedbug',
    pricingModel: 'fixed',
    basePrice: 35_000,
    durationMin: 120,
    optionGroups: [
      group('rooms', L('Rooms affected', 'عدد الغرف المصابة'), [
        choice('1-2', '1–2 rooms', '1–2 غرفة'),
        choice('3-4', '3–4 rooms', '3–4 غرف', 15_000, 60),
        choice('whole', 'Whole home', 'المنزل بالكامل', 30_000, 120),
      ]),
    ],
    includes: [
      L('Two treatment visits', 'زيارتا معالجة'),
      L('Mattress and furniture treatment', 'معالجة المراتب والأثاث'),
    ],
    warrantyDays: 60,
  },
  // ── Painting ──
  {
    id: 'svc-painting-room',
    categoryId: 'cat-painting',
    name: L('Room Painting', 'صباغة الغرف'),
    short: L(
      'Two coats, sharp lines, furniture fully protected.',
      'طبقتان وخطوط متقنة مع حماية كاملة للأثاث.',
    ),
    description: L(
      'Surface preparation, two coats of your chosen finish and a spotless clean-up.',
      'تجهيز الأسطح وطبقتان من الدهان المختار وتنظيف كامل بعد الانتهاء.',
    ),
    image: 'service.painting-room',
    pricingModel: 'per_unit',
    basePrice: 30_000,
    unitLabel: UNITS.room,
    minUnits: 1,
    maxUnits: 12,
    durationMin: 240,
    optionGroups: [
      group('paint-grade', L('Paint finish', 'نوع الدهان'), [
        choice('standard', 'Standard emulsion', 'دهان عادي'),
        choice('premium', 'Premium washable', 'دهان فاخر قابل للغسل', 10_000, 0),
        choice('designer', 'Designer finish', 'تشطيب ديكوري', 25_000, 120),
      ]),
    ],
    addOns: [
      addOn('ceiling', 'Ceiling painting', 'صباغة السقف', 8_000, 90),
      addOn('putty', 'Crack and putty repair', 'إصلاح الشقوق والمعجون', 5_000, 60),
      addOn('furniture', 'Furniture moving & covering', 'نقل الأثاث وتغطيته', 6_000, 45),
    ],
    includes: [
      L('Surface preparation', 'تجهيز الأسطح'),
      L('Two coats', 'طبقتان من الدهان'),
      L('Clean-up', 'التنظيف بعد العمل'),
    ],
    excludes: [L('Wallpaper removal', 'إزالة ورق الجدران')],
    warrantyDays: 180,
  },
  {
    id: 'svc-painting-villa',
    categoryId: 'cat-painting',
    name: L('Full Villa Painting — Survey', 'صباغة الفيلا بالكامل — معاينة'),
    short: L('On-site survey and a detailed, itemised quote.', 'معاينة في الموقع وعرض سعر مفصّل.'),
    description: L(
      'A senior painter surveys every room and sends an itemised quote in the app. Approve it and the work is scheduled.',
      'يعاين صبّاغ أول جميع الغرف ويرسل عرض سعر مفصلاً عبر التطبيق، وبعد موافقتك يتم جدولة العمل.',
    ),
    image: 'service.painting-villa',
    pricingModel: 'inspection',
    basePrice: 15_000,
    durationMin: 90,
    includes: [
      L('Full survey', 'معاينة شاملة'),
      L('Colour consultation', 'استشارة الألوان'),
      L('Itemised quote', 'عرض سعر مفصل'),
    ],
    warrantyDays: 180,
  },
  // ── Carpentry ──
  {
    id: 'svc-carpentry-assembly',
    categoryId: 'cat-carpentry',
    name: L('Furniture Assembly', 'تركيب الأثاث'),
    short: L(
      'Beds, wardrobes and desks, assembled perfectly.',
      'تركيب الأسرّة والدواليب والمكاتب بإتقان.',
    ),
    description: L(
      'Careful assembly with wall anchoring for tall furniture and packaging removed.',
      'تركيب دقيق مع تثبيت الأثاث الطويل بالجدار وإزالة مواد التغليف.',
    ),
    image: 'service.carpentry-assembly',
    pricingModel: 'per_unit',
    basePrice: 6_000,
    unitLabel: UNITS.item,
    minUnits: 1,
    maxUnits: 15,
    durationMin: 45,
    optionGroups: [
      group('item-size', L('Item size', 'حجم القطعة'), [
        choice('small', 'Small (desk, shelf, side table)', 'صغيرة (مكتب، رف، طاولة)'),
        choice('large', 'Large (wardrobe, bed)', 'كبيرة (دولاب، سرير)', 8_000, 60),
      ]),
    ],
    includes: [
      L('Assembly', 'التركيب'),
      L('Wall anchoring', 'التثبيت بالجدار'),
      L('Packaging removal', 'إزالة التغليف'),
    ],
    warrantyDays: 30,
  },
  {
    id: 'svc-carpentry-doors',
    categoryId: 'cat-carpentry',
    name: L('Door Repair & Lock Change', 'إصلاح الأبواب وتبديل الأقفال'),
    short: L('Doors that close smoothly and lock securely.', 'أبواب تُغلق بسلاسة وتُقفل بإحكام.'),
    description: L(
      'Alignment, hinge and handle repairs, and secure lock replacement.',
      'ضبط الأبواب وإصلاح المفصلات والمقابض وتبديل الأقفال بأمان.',
    ),
    image: 'service.carpentry-doors',
    pricingModel: 'fixed',
    basePrice: 8_000,
    durationMin: 60,
    optionGroups: [
      group('door-job', L('Job', 'نوع العمل'), [
        choice('adjust', 'Door adjustment', 'ضبط الباب'),
        choice('lock', 'Lock replacement', 'تبديل القفل', 6_000, 15),
        choice('handle', 'Handle replacement', 'تبديل المقبض', 2_000, 10),
      ]),
    ],
    includes: [L('Adjustment and lubrication', 'الضبط والتشحيم')],
    excludes: [L('Lock hardware', 'القفل نفسه')],
    warrantyDays: 30,
  },
  {
    id: 'svc-carpentry-kitchen',
    categoryId: 'cat-carpentry',
    name: L('Kitchen Cabinet Repair', 'إصلاح خزائن المطبخ'),
    short: L('Aligned doors, smooth drawers, like new.', 'أبواب مضبوطة وأدراج سلسة كأنها جديدة.'),
    description: L(
      'Hinge replacement, door alignment and drawer runner repairs for kitchens and wardrobes.',
      'تبديل المفصلات وضبط الأبواب وإصلاح مجاري الأدراج للمطابخ والدواليب.',
    ),
    image: 'service.carpentry-kitchen',
    pricingModel: 'fixed',
    basePrice: 12_000,
    durationMin: 90,
    optionGroups: [
      group('cabinet-job', L('Job', 'نوع العمل'), [
        choice('hinges', 'Hinges & alignment', 'المفصلات والضبط'),
        choice('runners', 'Drawer runners', 'مجاري الأدراج', 4_000, 30),
        choice('door', 'Cabinet door replacement', 'تبديل باب خزانة', 15_000, 60),
      ]),
    ],
    includes: [L('Adjustment of all doors', 'ضبط جميع الأبواب')],
    warrantyDays: 60,
  },
  // ── Appliances ──
  {
    id: 'svc-appliance-repair',
    categoryId: 'cat-appliances',
    name: L('Appliance Repair', 'إصلاح الأجهزة المنزلية'),
    short: L(
      'Washers, fridges, dryers, dishwashers and ovens.',
      'الغسالات والثلاجات والنشافات وغسالات الصحون والأفران.',
    ),
    description: inspectionNote,
    image: 'service.appliance-repair',
    pricingModel: 'inspection',
    basePrice: 6_000,
    durationMin: 60,
    optionGroups: [
      group('appliance', L('Appliance', 'الجهاز'), [
        choice('washer', 'Washing machine', 'غسالة ملابس'),
        choice('fridge', 'Refrigerator', 'ثلاجة'),
        choice('dryer', 'Dryer', 'نشافة'),
        choice('dishwasher', 'Dishwasher', 'غسالة صحون'),
        choice('oven', 'Oven or cooker', 'فرن أو طباخ'),
      ]),
    ],
    includes: [
      L('Diagnosis', 'التشخيص'),
      L('Repair quote in the app', 'عرض سعر الإصلاح في التطبيق'),
    ],
    excludes: [L('Spare parts (quoted separately)', 'قطع الغيار (تُسعّر بشكل منفصل)')],
    warrantyDays: 90,
    isPopular: true,
  },
  {
    id: 'svc-appliance-install',
    categoryId: 'cat-appliances',
    name: L('Appliance Installation', 'تركيب الأجهزة المنزلية'),
    short: L('Connected, levelled and tested.', 'توصيل وضبط واختبار.'),
    description: L(
      'Water, drain and power connections for new appliances, levelled and test-run.',
      'توصيل المياه والتصريف والكهرباء للأجهزة الجديدة مع ضبط الاستواء والتشغيل التجريبي.',
    ),
    image: 'service.appliance-install',
    pricingModel: 'per_unit',
    basePrice: 8_000,
    unitLabel: UNITS.appliance,
    minUnits: 1,
    maxUnits: 5,
    durationMin: 45,
    optionGroups: [
      group('install-type', L('Appliance', 'الجهاز'), [
        choice('washer', 'Washing machine', 'غسالة ملابس'),
        choice('dishwasher', 'Dishwasher', 'غسالة صحون', 2_000, 15),
        choice('built-in-oven', 'Built-in oven', 'فرن مدمج', 5_000, 30),
      ]),
    ],
    includes: [
      L('Connections', 'التوصيلات'),
      L('Levelling', 'ضبط الاستواء'),
      L('Test run', 'التشغيل التجريبي'),
    ],
    warrantyDays: 30,
  },
  // ── Handyman ──
  {
    id: 'svc-handyman-tv',
    categoryId: 'cat-handyman',
    name: L('TV Wall Mounting', 'تركيب التلفزيون على الجدار'),
    short: L(
      'Perfectly level, with optional hidden cables.',
      'تثبيت مستوٍ تماماً مع إمكانية إخفاء الأسلاك.',
    ),
    description: L(
      'Secure mounting on any wall type, levelled to the millimetre, with cable concealment available.',
      'تثبيت آمن على أي نوع من الجدران بضبط دقيق مع إمكانية إخفاء الأسلاك.',
    ),
    image: 'service.handyman-tv',
    pricingModel: 'per_unit',
    basePrice: 8_000,
    unitLabel: UNITS.tv,
    minUnits: 1,
    maxUnits: 5,
    durationMin: 45,
    optionGroups: [
      group('tv-size', L('TV size', 'حجم التلفزيون'), [
        choice('up-to-55', 'Up to 55"', 'حتى 55 بوصة'),
        choice('56-75', '56" – 75"', '56 – 75 بوصة', 4_000, 15),
        choice('76-plus', '76" and above', '76 بوصة فأكثر', 8_000, 30),
      ]),
    ],
    addOns: [
      addOn('cable-conceal', 'Cable concealment', 'إخفاء الأسلاك', 6_000, 45),
      addOn('bracket', 'Tilting bracket supplied', 'توفير حامل قابل للإمالة', 7_000, 0),
    ],
    includes: [
      L('Mounting', 'التثبيت'),
      L('Levelling', 'الضبط'),
      L('Device connection', 'توصيل الأجهزة'),
    ],
    warrantyDays: 30,
  },
  {
    id: 'svc-handyman-curtains',
    categoryId: 'cat-handyman',
    name: L('Curtain & Blind Installation', 'تركيب الستائر'),
    short: L(
      'Rods, tracks, blinds and motorised systems.',
      'القضبان والمجاري والستائر الرول والأنظمة الكهربائية.',
    ),
    description: L(
      'Precise drilling and installation for every window treatment, including motorised tracks.',
      'تركيب دقيق لجميع أنواع الستائر بما فيها المجاري الكهربائية.',
    ),
    image: 'service.handyman-curtains',
    pricingModel: 'per_unit',
    basePrice: 3_000,
    unitLabel: UNITS.window,
    minUnits: 1,
    maxUnits: 20,
    durationMin: 30,
    optionGroups: [
      group('curtain-type', L('Type', 'النوع'), [
        choice('rod', 'Curtain rod', 'قضيب ستارة'),
        choice('blind', 'Roller blind', 'ستارة رول', 1_000, 0),
        choice('motorised', 'Motorised track', 'مجرى كهربائي', 10_000, 45),
      ]),
    ],
    includes: [L('Drilling and fixing', 'الثقب والتثبيت'), L('Hanging', 'التعليق')],
    warrantyDays: 30,
  },
  {
    id: 'svc-handyman-hourly',
    categoryId: 'cat-handyman',
    name: L('Handyman by the Hour', 'فني صيانة بالساعة'),
    short: L('A skilled pair of hands for your to-do list.', 'فني ماهر لإنجاز قائمة مهامك.'),
    description: L(
      'Hanging mirrors and art, shelves, small repairs and adjustments — book the time you need.',
      'تعليق المرايا واللوحات والرفوف والإصلاحات البسيطة — احجز الوقت الذي تحتاجه.',
    ),
    image: 'service.handyman-hourly',
    pricingModel: 'hourly',
    basePrice: 8_000,
    unitLabel: UNITS.hour,
    minUnits: 1,
    maxUnits: 6,
    durationMin: 60,
    addOns: [addOn('hardware', 'Fixings & hardware kit', 'مجموعة براغي ومثبتات', 2_000, 0)],
    includes: [
      L('Small repairs', 'الإصلاحات البسيطة'),
      L('Hanging and mounting', 'التعليق والتثبيت'),
    ],
    warrantyDays: 30,
  },
  // ── Smart home ──
  {
    id: 'svc-smart-cctv',
    categoryId: 'cat-smart-home',
    name: L('CCTV Camera Installation', 'تركيب كاميرات المراقبة'),
    short: L('See your home from anywhere, securely.', 'راقب منزلك من أي مكان وبأمان.'),
    description: L(
      'Camera placement planning, neat cabling and set-up on your phone.',
      'تخطيط مواقع الكاميرات وتمديدات مرتبة وإعداد المشاهدة على هاتفك.',
    ),
    image: 'service.smart-cctv',
    pricingModel: 'per_unit',
    basePrice: 15_000,
    unitLabel: UNITS.camera,
    minUnits: 1,
    maxUnits: 16,
    durationMin: 60,
    optionGroups: [
      group('camera-type', L('Camera', 'الكاميرا'), [
        choice('indoor', 'Indoor HD', 'داخلية HD'),
        choice('outdoor', 'Outdoor 4K', 'خارجية 4K', 10_000, 15),
      ]),
    ],
    addOns: [
      addOn(
        'recorder',
        'Recorder & mobile app set-up',
        'إعداد جهاز التسجيل وتطبيق الجوال',
        12_000,
        60,
      ),
      addOn('remote-support', '30 days remote support', 'دعم عن بعد لمدة 30 يوماً', 5_000, 0),
    ],
    includes: [
      L('Placement plan', 'تخطيط المواقع'),
      L('Cabling', 'التمديدات'),
      L('Phone viewing set-up', 'إعداد المشاهدة على الهاتف'),
    ],
    excludes: [L('Cameras and recorder hardware', 'الكاميرات وجهاز التسجيل')],
    warrantyDays: 90,
  },
  {
    id: 'svc-smart-satellite',
    categoryId: 'cat-smart-home',
    name: L('Satellite Installation & Tuning', 'تركيب وضبط الستلايت'),
    short: L('Crystal-clear reception, every channel.', 'استقبال واضح لجميع القنوات.'),
    description: L(
      'Dish installation, precise alignment and receiver channel set-up.',
      'تركيب الصحن وضبط الاتجاه بدقة وبرمجة القنوات على الرسيفر.',
    ),
    image: 'service.smart-satellite',
    pricingModel: 'fixed',
    basePrice: 12_000,
    durationMin: 60,
    optionGroups: [
      group('satellite-job', L('Job', 'نوع العمل'), [
        choice('new', 'New installation', 'تركيب جديد'),
        choice('realign', 'Re-alignment & tuning', 'إعادة ضبط الاتجاه', -5_000, -30),
        choice('receiver', 'Receiver set-up only', 'برمجة الرسيفر فقط', -7_000, -40),
      ]),
    ],
    includes: [L('Alignment', 'ضبط الاتجاه'), L('Channel set-up', 'برمجة القنوات')],
    warrantyDays: 30,
  },
  {
    id: 'svc-smart-lock',
    categoryId: 'cat-smart-home',
    name: L('Smart Lock Installation', 'تركيب الأقفال الذكية'),
    short: L('Keyless entry, fitted and configured.', 'دخول بلا مفاتيح مع التركيب والإعداد.'),
    description: L(
      'Installation of your smart lock with app pairing, fingerprints and access codes configured.',
      'تركيب القفل الذكي وربطه بالتطبيق وإعداد البصمات ورموز الدخول.',
    ),
    image: 'service.smart-lock',
    pricingModel: 'fixed',
    basePrice: 10_000,
    durationMin: 60,
    optionGroups: [
      group('door-type', L('Door type', 'نوع الباب'), [
        choice('wood', 'Wooden door', 'باب خشبي'),
        choice('glass', 'Glass or aluminium door', 'باب زجاج أو ألمنيوم', 5_000, 30),
      ]),
    ],
    addOns: [addOn('app-setup', 'Family access set-up', 'إعداد صلاحيات العائلة', 3_000, 15)],
    includes: [L('Installation', 'التركيب'), L('App pairing', 'الربط بالتطبيق')],
    excludes: [L('The lock itself', 'القفل نفسه')],
    warrantyDays: 90,
  },
];

export const services: Service[] = serviceSeeds.map((s) => ({
  id: s.id,
  categoryId: s.categoryId,
  slug: s.id.replace(/^svc-/, ''),
  name: s.name,
  shortDescription: s.short,
  description: s.description,
  image: s.image,
  pricingModel: s.pricingModel,
  basePrice: s.basePrice,
  ...(s.unitLabel ? { unitLabel: s.unitLabel } : {}),
  minUnits: s.minUnits ?? 1,
  maxUnits: s.maxUnits ?? 1,
  durationMin: s.durationMin,
  optionGroups: s.optionGroups ?? [],
  addOns: s.addOns ?? [],
  includes: s.includes,
  excludes: s.excludes ?? [],
  warrantyDays: s.warrantyDays,
  rating: 0,
  reviewsCount: 0,
  bookingsCount: 0,
  isPopular: s.isPopular ?? false,
  isActive: true,
}));
