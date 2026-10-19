import type { Locale, LocalizedText, MediaKey, TicketCategory, TicketPriority } from '../../types';

const L = (en: string, ar: string): LocalizedText => ({ en, ar });

export interface CouponSeed {
  id: string;
  code: string;
  description: LocalizedText;
  type: 'percent' | 'fixed';
  value: number;
  maxDiscount?: number;
  minSubtotal: number;
  categoryIds: string[];
  firstBookingOnly: boolean;
  /** Day offsets relative to the seed reference time. */
  validFromDays: number;
  validUntilDays: number;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export const couponSeeds: CouponSeed[] = [
  {
    id: 'cpn-welcome',
    code: 'WELCOME10',
    description: L('10% off your first booking, up to KWD 5', 'خصم 10% على حجزك الأول حتى 5 د.ك'),
    type: 'percent',
    value: 10,
    maxDiscount: 5_000,
    minSubtotal: 5_000,
    categoryIds: [],
    firstBookingOnly: true,
    validFromDays: -120,
    validUntilDays: 240,
    usageLimit: 10_000,
    usedCount: 1_843,
    isActive: true,
  },
  {
    id: 'cpn-cool',
    code: 'COOL25',
    description: L('25% off AC services, up to KWD 7', 'خصم 25% على خدمات التكييف حتى 7 د.ك'),
    type: 'percent',
    value: 25,
    maxDiscount: 7_000,
    minSubtotal: 8_000,
    categoryIds: ['cat-ac'],
    firstBookingOnly: false,
    validFromDays: -40,
    validUntilDays: 45,
    usageLimit: 5_000,
    usedCount: 2_210,
    isActive: true,
  },
  {
    id: 'cpn-clean',
    code: 'CLEAN5',
    description: L('KWD 5 off cleaning over KWD 40', 'خصم 5 د.ك على التنظيف فوق 40 د.ك'),
    type: 'fixed',
    value: 5_000,
    minSubtotal: 40_000,
    categoryIds: ['cat-cleaning'],
    firstBookingOnly: false,
    validFromDays: -20,
    validUntilDays: 30,
    usageLimit: 2_000,
    usedCount: 412,
    isActive: true,
  },
  {
    id: 'cpn-national',
    code: 'NATIONALDAY',
    description: L(
      '20% off everything for National Day',
      'خصم 20% على جميع الخدمات بمناسبة العيد الوطني',
    ),
    type: 'percent',
    value: 20,
    maxDiscount: 10_000,
    minSubtotal: 10_000,
    categoryIds: [],
    firstBookingOnly: false,
    validFromDays: -240,
    validUntilDays: -230,
    usageLimit: 3_000,
    usedCount: 2_964,
    isActive: true,
  },
  {
    id: 'cpn-vip',
    code: 'VIP15',
    description: L('15% for Platinum members', 'خصم 15% لأعضاء البلاتينيوم'),
    type: 'percent',
    value: 15,
    maxDiscount: 15_000,
    minSubtotal: 20_000,
    categoryIds: [],
    firstBookingOnly: false,
    validFromDays: -10,
    validUntilDays: 80,
    usageLimit: 500,
    usedCount: 37,
    isActive: false,
  },
];

export interface PromotionSeed {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  image: MediaKey;
  ctaLabel: LocalizedText;
  target: { type: 'category' | 'service'; id: string };
  couponCode?: string;
  validUntilDays: number;
}

export const promotionSeeds: PromotionSeed[] = [
  {
    id: 'promo-cool',
    title: L('Breathe easier this season', 'تنفّس هواءً أنقى هذا الموسم'),
    subtitle: L('25% off AC deep cleaning with COOL25', 'خصم 25% على تنظيف المكيفات مع COOL25'),
    image: 'promo.summer-ac',
    ctaLabel: L('Book AC care', 'احجز صيانة التكييف'),
    target: { type: 'service', id: 'svc-ac-cleaning' },
    couponCode: 'COOL25',
    validUntilDays: 45,
  },
  {
    id: 'promo-deep',
    title: L('A spotless home, rediscovered', 'منزل نظيف كأنه جديد'),
    subtitle: L('KWD 5 off deep cleaning with CLEAN5', 'خصم 5 د.ك على التنظيف العميق مع CLEAN5'),
    image: 'promo.deep-clean',
    ctaLabel: L('Explore deep cleaning', 'اكتشف التنظيف العميق'),
    target: { type: 'service', id: 'svc-cleaning-deep' },
    couponCode: 'CLEAN5',
    validUntilDays: 30,
  },
  {
    id: 'promo-welcome',
    title: L('Welcome home', 'أهلاً بك في بيتك'),
    subtitle: L('10% off your first booking with WELCOME10', 'خصم 10% على حجزك الأول مع WELCOME10'),
    image: 'promo.welcome',
    ctaLabel: L('Browse services', 'تصفح الخدمات'),
    target: { type: 'category', id: 'cat-cleaning' },
    couponCode: 'WELCOME10',
    validUntilDays: 240,
  },
];

/** Review comments by rating, in the language the customer wrote them. */
export const reviewComments: Record<1 | 2 | 3 | 4 | 5, { text: string; language: Locale }[]> = {
  5: [
    {
      text: 'Arrived on time, worked carefully and left everything spotless. Highly recommended.',
      language: 'en',
    },
    { text: 'Very professional and polite. Explained everything before starting.', language: 'en' },
    { text: 'Excellent service from start to finish. Will definitely book again.', language: 'en' },
    { text: 'Quick, clean and friendly. Exactly what I hoped for.', language: 'en' },
    { text: 'خدمة ممتازة والفني محترم جداً وملتزم بالموعد.', language: 'ar' },
    { text: 'شغل نظيف ومرتب، شكراً لكم.', language: 'ar' },
    { text: 'تعامل راقٍ وسرعة في الإنجاز، أنصح بهم بشدة.', language: 'ar' },
    { text: 'أفضل خدمة جربتها في الكويت، يعطيكم العافية.', language: 'ar' },
  ],
  4: [
    { text: 'Good job overall. Arrived a little late but called ahead.', language: 'en' },
    { text: 'Solid work and fair price. Would use again.', language: 'en' },
    { text: 'Happy with the result, communication could be a bit better.', language: 'en' },
    { text: 'خدمة جيدة وسعر مناسب.', language: 'ar' },
    { text: 'الشغل حلو بس تأخر شوي عن الموعد.', language: 'ar' },
  ],
  3: [
    { text: 'The job was done but took longer than expected.', language: 'en' },
    { text: 'Average experience. Had to point out a few missed spots.', language: 'en' },
    { text: 'الخدمة مقبولة لكن تحتاج اهتمام أكثر بالتفاصيل.', language: 'ar' },
  ],
  2: [
    { text: 'Technician was polite but the problem came back after two days.', language: 'en' },
    { text: 'تأخر كثير عن الموعد ولم يتم العمل بالشكل المطلوب.', language: 'ar' },
  ],
  1: [{ text: 'Very disappointed — the technician left without finishing.', language: 'en' }],
};

/** On-site repair quotes for inspection-priced services, by category. */
export const extraChargeTemplates: Record<
  string,
  { description: string; min: number; max: number }[]
> = {
  'cat-ac': [
    { description: 'Replace capacitor', min: 8_000, max: 14_000 },
    { description: 'Replace fan motor', min: 22_000, max: 35_000 },
    { description: 'Repair refrigerant leak and recharge', min: 18_000, max: 30_000 },
  ],
  'cat-plumbing': [
    { description: 'Replace concealed pipe joint', min: 12_000, max: 22_000 },
    { description: 'Replace cistern fill valve', min: 6_000, max: 10_000 },
    { description: 'Re-seal shower tray', min: 9_000, max: 15_000 },
  ],
  'cat-electrical': [
    { description: 'Replace faulty breaker', min: 7_000, max: 12_000 },
    { description: 'Rewire kitchen circuit', min: 25_000, max: 45_000 },
  ],
  'cat-pest': [{ description: 'Termite barrier treatment', min: 45_000, max: 90_000 }],
  'cat-painting': [{ description: 'Villa painting — approved quote', min: 450_000, max: 900_000 }],
  'cat-appliances': [
    { description: 'Replace drain pump', min: 14_000, max: 22_000 },
    { description: 'Replace thermostat', min: 10_000, max: 18_000 },
    { description: 'Replace door seal', min: 8_000, max: 12_000 },
  ],
};

export const cancellationReasons = [
  'Plans changed',
  'Booked by mistake',
  'Found another solution',
  'Need a different time',
];

export interface TicketTemplate {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  message: string;
  agentReply?: string;
}

export const ticketTemplates: TicketTemplate[] = [
  {
    subject: 'Question about my refund',
    category: 'payment',
    priority: 'normal',
    message: 'I cancelled a booking yesterday. When will the refund reach my KNET account?',
    agentReply:
      'Refunds to KNET usually reach your bank within 3–5 working days. We will keep this ticket open until you confirm.',
  },
  {
    subject: 'Technician running late',
    category: 'technician',
    priority: 'high',
    message: 'My technician has not arrived and the window is almost over.',
    agentReply: 'Sorry for the wait — we have contacted the technician, who is 15 minutes away.',
  },
  {
    subject: 'Change booking address',
    category: 'booking',
    priority: 'normal',
    message: 'I need to change the address for my upcoming booking to my mother’s house.',
  },
  {
    subject: 'AC still not cooling after service',
    category: 'booking',
    priority: 'urgent',
    message: 'The AC was serviced three days ago but it has stopped cooling again.',
    agentReply: 'This is covered by your 30-day warranty. We have scheduled a free return visit.',
  },
  {
    subject: 'Invoice for my company',
    category: 'payment',
    priority: 'low',
    message: 'Can I get an invoice with my company name for last month’s bookings?',
  },
  {
    subject: 'App shows wrong area',
    category: 'app',
    priority: 'low',
    message: 'The map pin puts me in Bayan but I live in Mishref.',
  },
  {
    subject: 'Payout not received',
    category: 'payment',
    priority: 'high',
    message: 'My weekly payout for last week is still showing as processing.',
    agentReply: 'Finance has released the transfer today. It should arrive within one working day.',
  },
];
