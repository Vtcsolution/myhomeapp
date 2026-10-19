/**
 * Fictional people and companies. Any resemblance to real persons or
 * businesses is coincidental. Timestamps are expressed as day offsets from the
 * seed's reference time and resolved in `seed.ts`.
 */
import type {
  AddressLabel,
  GovernorateId,
  Locale,
  LocalizedText,
  MembershipTier,
  PropertyType,
  SpokenLanguage,
  TechnicianAvailability,
  TechnicianDocument,
  TechnicianStatus,
  VendorStatus,
} from '../../types';

const L = (en: string, ar: string): LocalizedText => ({ en, ar });

const ALL_GOVERNORATES: GovernorateId[] = [
  'capital',
  'hawalli',
  'farwaniya',
  'mubarak-al-kabeer',
  'ahmadi',
  'jahra',
];

export interface VendorSeed {
  id: string;
  name: LocalizedText;
  legalName: string;
  crNumber: string;
  contactName: string;
  phone: string;
  email: string;
  categoryIds: string[];
  governorateIds: GovernorateId[];
  commissionRate: number;
  status: VendorStatus;
  joinedDaysAgo: number;
}

export const vendorSeeds: VendorSeed[] = [
  {
    id: 'ven-arctic',
    name: L('Arctic Pearl Technical Services', 'اللؤلؤة القطبية للخدمات الفنية'),
    legalName: 'Arctic Pearl Technical Services Co. W.L.L.',
    crNumber: 'CR-284716',
    contactName: 'Waleed Al-Saleh',
    phone: '+96522410870',
    email: 'ops@arcticpearl.demo',
    categoryIds: ['cat-ac', 'cat-appliances', 'cat-electrical'],
    governorateIds: ['capital', 'hawalli', 'farwaniya', 'mubarak-al-kabeer', 'ahmadi', 'jahra'],
    commissionRate: 0.12,
    status: 'active',
    joinedDaysAgo: 410,
  },
  {
    id: 'ven-sidra',
    name: L('Sidra Facility Care', 'سدرة للعناية بالمرافق'),
    legalName: 'Sidra Facility Care General Trading & Contracting Co.',
    crNumber: 'CR-301552',
    contactName: 'Mariam Al-Hashel',
    phone: '+96522985531',
    email: 'hello@sidracare.demo',
    categoryIds: ['cat-cleaning', 'cat-pest'],
    governorateIds: ALL_GOVERNORATES,
    commissionRate: 0.15,
    status: 'active',
    joinedDaysAgo: 365,
  },
  {
    id: 'ven-bayt',
    name: L('Bayt Fix Contracting', 'بيت فكس للمقاولات'),
    legalName: 'Bayt Fix General Contracting Co. W.L.L.',
    crNumber: 'CR-276904',
    contactName: 'Nasser Al-Qattan',
    phone: '+96524731190',
    email: 'jobs@baytfix.demo',
    categoryIds: [
      'cat-plumbing',
      'cat-electrical',
      'cat-painting',
      'cat-carpentry',
      'cat-handyman',
    ],
    governorateIds: ALL_GOVERNORATES,
    commissionRate: 0.13,
    status: 'active',
    joinedDaysAgo: 300,
  },
  {
    id: 'ven-najma',
    name: L('Najma Smart Systems', 'نجمة للأنظمة الذكية'),
    legalName: 'Najma Smart Systems Co.',
    crNumber: 'CR-418237',
    contactName: 'Bader Al-Roumi',
    phone: '+96522207754',
    email: 'info@najmasmart.demo',
    categoryIds: ['cat-smart-home', 'cat-electrical'],
    governorateIds: ['capital', 'hawalli', 'mubarak-al-kabeer'],
    commissionRate: 0.14,
    status: 'pending_approval',
    joinedDaysAgo: 3,
  },
];

const day = (start: string, end: string) => ({ start, end });

/** Sat–Thu daytime shift, Friday off. */
const shiftDay: TechnicianAvailability = {
  weekly: {
    0: day('08:00', '20:00'),
    1: day('08:00', '20:00'),
    2: day('08:00', '20:00'),
    3: day('08:00', '20:00'),
    4: day('08:00', '20:00'),
    5: null,
    6: day('08:00', '20:00'),
  },
  daysOff: [],
};

/** Late shift including Friday afternoons. */
const shiftLate: TechnicianAvailability = {
  weekly: {
    0: day('10:00', '22:00'),
    1: day('10:00', '22:00'),
    2: day('10:00', '22:00'),
    3: null,
    4: day('10:00', '22:00'),
    5: day('14:00', '22:00'),
    6: day('10:00', '22:00'),
  },
  daysOff: [],
};

export interface TechnicianSeed {
  id: string;
  fullName: LocalizedText;
  phone: string;
  vendorId: string | null;
  categoryIds: string[];
  governorateIds: GovernorateId[];
  headline: LocalizedText;
  bio: LocalizedText;
  languages: SpokenLanguage[];
  yearsExperience: number;
  status: TechnicianStatus;
  isOnline: boolean;
  availability: TechnicianAvailability;
  joinedDaysAgo: number;
  documents: DocumentSeed[];
}

export type DocumentSeed = Pick<TechnicianDocument, 'id' | 'type' | 'status'> & {
  /** Negative values mean the document has already expired. */
  expiresInDays: number;
};

const verifiedDocs = (prefix: string): DocumentSeed[] => [
  { id: `${prefix}-civil`, type: 'civil_id', status: 'verified', expiresInDays: 540 },
  { id: `${prefix}-cert`, type: 'certificate', status: 'verified', expiresInDays: 900 },
  { id: `${prefix}-ins`, type: 'insurance', status: 'verified', expiresInDays: 200 },
];

export const technicianSeeds: TechnicianSeed[] = [
  {
    id: 'tec-01',
    fullName: L('Rajesh Kumar', 'راجيش كومار'),
    phone: '+96560001001',
    vendorId: null,
    categoryIds: ['cat-ac'],
    governorateIds: ['capital', 'hawalli', 'mubarak-al-kabeer'],
    headline: L('Senior AC specialist', 'أخصائي تكييف أول'),
    bio: L(
      'Nine years keeping Kuwaiti homes cool. Specialist in split and cassette systems, known for tidy, careful work.',
      'تسع سنوات في الحفاظ على برودة المنازل في الكويت. متخصص في أنظمة السبليت والكاسيت ومعروف بعمله المرتب والدقيق.',
    ),
    languages: ['en', 'hi', 'ar'],
    yearsExperience: 9,
    status: 'active',
    isOnline: true,
    availability: shiftDay,
    joinedDaysAgo: 380,
    documents: verifiedDocs('tec-01'),
  },
  {
    id: 'tec-02',
    fullName: L('Mohammed Farouk', 'محمد فاروق'),
    phone: '+96560001002',
    vendorId: 'ven-arctic',
    categoryIds: ['cat-ac'],
    governorateIds: ['capital', 'hawalli', 'farwaniya', 'jahra'],
    headline: L('Central AC engineer', 'مهندس تكييف مركزي'),
    bio: L(
      'Twelve years on central and package systems for villas and offices.',
      'اثنا عشر عاماً من الخبرة في أنظمة التكييف المركزي للفلل والمكاتب.',
    ),
    languages: ['ar', 'en'],
    yearsExperience: 12,
    status: 'active',
    isOnline: true,
    availability: shiftLate,
    joinedDaysAgo: 400,
    documents: verifiedDocs('tec-02'),
  },
  {
    id: 'tec-03',
    fullName: L('Sunil Thomas', 'سونيل توماس'),
    phone: '+96560001003',
    vendorId: 'ven-arctic',
    categoryIds: ['cat-ac', 'cat-appliances'],
    governorateIds: ['hawalli', 'mubarak-al-kabeer', 'ahmadi'],
    headline: L('AC & appliance technician', 'فني تكييف وأجهزة منزلية'),
    bio: L('Calm, methodical and fast at diagnosis.', 'هادئ ومنهجي وسريع في التشخيص.'),
    languages: ['en', 'ml', 'hi'],
    yearsExperience: 7,
    status: 'active',
    isOnline: false,
    availability: shiftDay,
    joinedDaysAgo: 350,
    documents: verifiedDocs('tec-03'),
  },
  {
    id: 'tec-04',
    fullName: L('Imran Qureshi', 'عمران قريشي'),
    phone: '+96560001004',
    vendorId: null,
    categoryIds: ['cat-ac'],
    governorateIds: ['farwaniya', 'jahra', 'capital'],
    headline: L('AC installation specialist', 'أخصائي تركيب مكيفات'),
    bio: L(
      'Clean installations with neat, hidden piping.',
      'تركيبات نظيفة مع تمديدات مرتبة ومخفية.',
    ),
    languages: ['ur', 'en', 'ar'],
    yearsExperience: 6,
    status: 'active',
    isOnline: true,
    availability: shiftLate,
    joinedDaysAgo: 280,
    documents: verifiedDocs('tec-04'),
  },
  {
    id: 'tec-05',
    fullName: L('Joel Santos', 'جويل سانتوس'),
    phone: '+96560001005',
    vendorId: 'ven-sidra',
    categoryIds: ['cat-cleaning'],
    governorateIds: ['capital', 'hawalli', 'mubarak-al-kabeer'],
    headline: L('Deep-cleaning team lead', 'قائد فريق التنظيف العميق'),
    bio: L(
      'Leads a three-person deep-cleaning team.',
      'يقود فريقاً من ثلاثة أشخاص للتنظيف العميق.',
    ),
    languages: ['tl', 'en'],
    yearsExperience: 5,
    status: 'active',
    isOnline: true,
    availability: shiftLate,
    joinedDaysAgo: 330,
    documents: verifiedDocs('tec-05'),
  },
  {
    id: 'tec-06',
    fullName: L('Grace Villanueva', 'غريس فيلانويفا'),
    phone: '+96560001006',
    vendorId: 'ven-sidra',
    categoryIds: ['cat-cleaning'],
    governorateIds: ['farwaniya', 'jahra', 'capital'],
    headline: L('Home cleaning specialist', 'أخصائية تنظيف منازل'),
    bio: L(
      'Detail-oriented, trusted by families across Kuwait.',
      'دقيقة في التفاصيل وموثوقة لدى العائلات في الكويت.',
    ),
    languages: ['tl', 'en'],
    yearsExperience: 4,
    status: 'active',
    isOnline: true,
    availability: shiftDay,
    joinedDaysAgo: 300,
    documents: verifiedDocs('tec-06'),
  },
  {
    id: 'tec-07',
    fullName: L('Anil Menon', 'أنيل مينون'),
    phone: '+96560001007',
    vendorId: 'ven-sidra',
    categoryIds: ['cat-pest'],
    governorateIds: ALL_GOVERNORATES,
    headline: L('Licensed pest control officer', 'مسؤول مكافحة حشرات مرخّص'),
    bio: L(
      'Ten years of discreet, effective treatments.',
      'عشر سنوات من المعالجات الفعالة والدقيقة.',
    ),
    languages: ['ml', 'en', 'ar'],
    yearsExperience: 10,
    status: 'active',
    isOnline: true,
    availability: shiftLate,
    joinedDaysAgo: 360,
    documents: verifiedDocs('tec-07'),
  },
  {
    id: 'tec-08',
    fullName: L('Hassan Mahmoud', 'حسن محمود'),
    phone: '+96560001008',
    vendorId: 'ven-bayt',
    categoryIds: ['cat-plumbing'],
    governorateIds: ['capital', 'hawalli', 'farwaniya', 'jahra'],
    headline: L('Master plumber', 'سبّاك محترف'),
    bio: L(
      'Fifteen years finding the leaks others miss.',
      'خمسة عشر عاماً في كشف التسربات التي يغفل عنها الآخرون.',
    ),
    languages: ['ar'],
    yearsExperience: 15,
    status: 'active',
    isOnline: true,
    availability: shiftDay,
    joinedDaysAgo: 290,
    documents: verifiedDocs('tec-08'),
  },
  {
    id: 'tec-09',
    fullName: L('Bilal Hussain', 'بلال حسين'),
    phone: '+96560001009',
    vendorId: null,
    categoryIds: ['cat-plumbing', 'cat-handyman'],
    governorateIds: ['hawalli', 'mubarak-al-kabeer', 'ahmadi', 'farwaniya'],
    headline: L('Plumber & handyman', 'سبّاك وفني صيانة'),
    bio: L('Reliable, punctual and tidy.', 'موثوق ودقيق في المواعيد ومرتب.'),
    languages: ['ur', 'en'],
    yearsExperience: 8,
    status: 'active',
    isOnline: false,
    availability: shiftLate,
    joinedDaysAgo: 250,
    documents: verifiedDocs('tec-09'),
  },
  {
    id: 'tec-10',
    fullName: L('Karim Adel', 'كريم عادل'),
    phone: '+96560001010',
    vendorId: 'ven-bayt',
    categoryIds: ['cat-electrical'],
    governorateIds: ['capital', 'hawalli', 'farwaniya', 'jahra'],
    headline: L('Licensed electrician', 'كهربائي مرخّص'),
    bio: L(
      'Safety-first electrical work for homes and villas.',
      'أعمال كهربائية تضع السلامة أولاً للمنازل والفلل.',
    ),
    languages: ['ar', 'en'],
    yearsExperience: 11,
    status: 'active',
    isOnline: true,
    availability: shiftDay,
    joinedDaysAgo: 280,
    documents: verifiedDocs('tec-10'),
  },
  {
    id: 'tec-11',
    fullName: L('Vijay Nair', 'فيجاي ناير'),
    phone: '+96560001011',
    vendorId: null,
    categoryIds: ['cat-electrical', 'cat-smart-home'],
    governorateIds: ['hawalli', 'mubarak-al-kabeer', 'ahmadi', 'capital'],
    headline: L('Electrician & smart-home installer', 'كهربائي وفني منازل ذكية'),
    bio: L('Lighting design and smart-home set-ups.', 'تصميم الإنارة وتجهيز المنازل الذكية.'),
    languages: ['en', 'hi', 'ml'],
    yearsExperience: 9,
    status: 'active',
    isOnline: true,
    availability: shiftLate,
    joinedDaysAgo: 260,
    documents: verifiedDocs('tec-11'),
  },
  {
    id: 'tec-12',
    fullName: L('Ramon dela Cruz', 'رامون ديلا كروز'),
    phone: '+96560001012',
    vendorId: 'ven-bayt',
    categoryIds: ['cat-painting'],
    governorateIds: ALL_GOVERNORATES,
    headline: L('Senior painter', 'صبّاغ أول'),
    bio: L(
      'Thirteen years of flawless interior finishes.',
      'ثلاثة عشر عاماً من التشطيبات الداخلية المتقنة.',
    ),
    languages: ['tl', 'en'],
    yearsExperience: 13,
    status: 'active',
    isOnline: true,
    availability: shiftDay,
    joinedDaysAgo: 270,
    documents: verifiedDocs('tec-12'),
  },
  {
    id: 'tec-13',
    fullName: L('Omar Khaled', 'عمر خالد'),
    phone: '+96560001013',
    vendorId: 'ven-bayt',
    categoryIds: ['cat-carpentry', 'cat-handyman'],
    governorateIds: ALL_GOVERNORATES,
    headline: L('Master carpenter', 'نجّار محترف'),
    bio: L('Fine woodwork, doors and fitted furniture.', 'أعمال خشبية دقيقة وأبواب وأثاث مثبت.'),
    languages: ['ar'],
    yearsExperience: 14,
    status: 'active',
    isOnline: false,
    availability: shiftLate,
    joinedDaysAgo: 270,
    documents: verifiedDocs('tec-13'),
  },
  {
    id: 'tec-14',
    fullName: L('Samir Haddad', 'سمير حداد'),
    phone: '+96560001014',
    vendorId: null,
    categoryIds: ['cat-appliances'],
    governorateIds: ALL_GOVERNORATES,
    headline: L('Appliance repair expert', 'خبير إصلاح الأجهزة المنزلية'),
    bio: L(
      'Factory-trained on leading appliance brands.',
      'مدرّب لدى كبرى الشركات المصنعة للأجهزة المنزلية.',
    ),
    languages: ['ar', 'en'],
    yearsExperience: 10,
    status: 'active',
    isOnline: true,
    availability: shiftDay,
    joinedDaysAgo: 240,
    documents: verifiedDocs('tec-14'),
  },
  {
    id: 'tec-15',
    fullName: L('Mark Reyes', 'مارك رييس'),
    phone: '+96560001015',
    vendorId: null,
    categoryIds: ['cat-handyman', 'cat-smart-home'],
    governorateIds: ['capital', 'hawalli', 'mubarak-al-kabeer'],
    headline: L('Handyman & AV installer', 'فني صيانة وتركيب أنظمة صوت وصورة'),
    bio: L(
      'TV walls, cable management and finishing touches.',
      'جدران التلفزيون وتنظيم الأسلاك واللمسات النهائية.',
    ),
    languages: ['tl', 'en'],
    yearsExperience: 6,
    status: 'active',
    isOnline: true,
    availability: shiftLate,
    joinedDaysAgo: 220,
    documents: verifiedDocs('tec-15'),
  },
  {
    id: 'tec-16',
    fullName: L('Faisal Al-Mutairi', 'فيصل المطيري'),
    phone: '+96560001016',
    vendorId: null,
    categoryIds: ['cat-smart-home'],
    governorateIds: ALL_GOVERNORATES,
    headline: L('Security systems specialist', 'أخصائي أنظمة أمنية'),
    bio: L(
      'CCTV and access control for homes and businesses.',
      'كاميرات مراقبة وأنظمة دخول للمنازل والشركات.',
    ),
    languages: ['ar', 'en'],
    yearsExperience: 7,
    status: 'active',
    isOnline: false,
    availability: shiftDay,
    joinedDaysAgo: 200,
    documents: verifiedDocs('tec-16'),
  },
  {
    id: 'tec-17',
    fullName: L('Arjun Pillai', 'أرجون بيلاي'),
    phone: '+96560001017',
    vendorId: null,
    categoryIds: ['cat-cleaning'],
    governorateIds: ['hawalli', 'capital'],
    headline: L('Upholstery cleaning technician', 'فني تنظيف مفروشات'),
    bio: L('Specialist in sofa and carpet care.', 'متخصص في العناية بالكنب والسجاد.'),
    languages: ['en', 'ml'],
    yearsExperience: 3,
    status: 'pending_approval',
    isOnline: false,
    availability: shiftDay,
    joinedDaysAgo: 2,
    documents: [
      { id: 'tec-17-civil', type: 'civil_id', status: 'pending', expiresInDays: 700 },
      { id: 'tec-17-cert', type: 'certificate', status: 'pending', expiresInDays: 1000 },
    ],
  },
  {
    id: 'tec-18',
    fullName: L('Tariq Nadeem', 'طارق نديم'),
    phone: '+96560001018',
    vendorId: null,
    categoryIds: ['cat-painting', 'cat-carpentry'],
    governorateIds: ['farwaniya', 'jahra'],
    headline: L('Painter & carpenter', 'صبّاغ ونجّار'),
    bio: L('Versatile finishing work.', 'أعمال تشطيب متنوعة.'),
    languages: ['ur'],
    yearsExperience: 5,
    status: 'suspended',
    isOnline: false,
    availability: shiftDay,
    joinedDaysAgo: 190,
    documents: [
      { id: 'tec-18-civil', type: 'civil_id', status: 'verified', expiresInDays: 300 },
      { id: 'tec-18-ins', type: 'insurance', status: 'expired', expiresInDays: -12 },
    ],
  },
  {
    id: 'tec-19',
    fullName: L('Ahmed Saeed', 'أحمد سعيد'),
    phone: '+96560001019',
    vendorId: 'ven-arctic',
    categoryIds: ['cat-ac', 'cat-electrical'],
    governorateIds: ['ahmadi', 'mubarak-al-kabeer', 'hawalli'],
    headline: L('AC & electrical technician', 'فني تكييف وكهرباء'),
    bio: L('Dependable across AC and electrical work.', 'خبرة موثوقة في أعمال التكييف والكهرباء.'),
    languages: ['ar'],
    yearsExperience: 8,
    status: 'active',
    isOnline: true,
    availability: shiftLate,
    joinedDaysAgo: 320,
    documents: verifiedDocs('tec-19'),
  },
  {
    id: 'tec-20',
    fullName: L('Rohan Das', 'روهان داس'),
    phone: '+96560001020',
    vendorId: 'ven-sidra',
    categoryIds: ['cat-cleaning'],
    governorateIds: ['ahmadi', 'mubarak-al-kabeer', 'hawalli'],
    headline: L('Cleaning professional', 'أخصائي تنظيف'),
    bio: L('Thorough and efficient, with a light touch.', 'دقيق وفعال ولطيف في التعامل.'),
    languages: ['bn', 'en'],
    yearsExperience: 4,
    status: 'active',
    isOnline: true,
    availability: shiftDay,
    joinedDaysAgo: 310,
    documents: verifiedDocs('tec-20'),
  },
];

export interface AddressSeed {
  id: string;
  label: AddressLabel;
  customLabel?: string;
  propertyType: PropertyType;
  areaId: string;
  block: string;
  street: string;
  avenue?: string;
  building: string;
  floor?: string;
  apartment?: string;
  paciNumber?: string;
  directions?: string;
}

export interface CustomerSeed {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  preferredLocale: Locale;
  membership: MembershipTier;
  joinedDaysAgo: number;
  status?: 'active' | 'blocked';
  addresses: AddressSeed[];
}

export const customerSeeds: CustomerSeed[] = [
  {
    id: 'cus-01',
    fullName: 'Noura Al-Kandari',
    phone: '+96555550101',
    email: 'noura.k@example.com',
    preferredLocale: 'en',
    membership: 'gold',
    joinedDaysAgo: 210,
    addresses: [
      {
        id: 'adr-01-home',
        label: 'home',
        propertyType: 'villa',
        areaId: 'salwa',
        block: '4',
        street: '12',
        avenue: '3',
        building: '27',
        paciNumber: '18734522',
        directions: 'White villa with a wooden gate, opposite the mosque.',
      },
      {
        id: 'adr-01-family',
        label: 'other',
        customLabel: "Mother's house",
        propertyType: 'house',
        areaId: 'rawda',
        block: '2',
        street: '24',
        building: '9',
      },
    ],
  },
  {
    id: 'cus-02',
    fullName: 'Abdullah Al-Ajmi',
    phone: '+96555550102',
    preferredLocale: 'ar',
    membership: 'platinum',
    joinedDaysAgo: 330,
    addresses: [
      {
        id: 'adr-02',
        label: 'home',
        propertyType: 'villa',
        areaId: 'mishref',
        block: '6',
        street: '3',
        avenue: '1',
        building: '14',
      },
    ],
  },
  {
    id: 'cus-03',
    fullName: 'Priya Sharma',
    phone: '+96555550103',
    email: 'priya.s@example.com',
    preferredLocale: 'en',
    membership: 'classic',
    joinedDaysAgo: 160,
    addresses: [
      {
        id: 'adr-03',
        label: 'home',
        propertyType: 'apartment',
        areaId: 'salmiya',
        block: '10',
        street: 'Baghdad St',
        building: '33',
        floor: '6',
        apartment: '62',
      },
    ],
  },
  {
    id: 'cus-04',
    fullName: 'Khalid Al-Otaibi',
    phone: '+96555550104',
    preferredLocale: 'ar',
    membership: 'gold',
    joinedDaysAgo: 290,
    addresses: [
      {
        id: 'adr-04',
        label: 'home',
        propertyType: 'house',
        areaId: 'qortuba',
        block: '3',
        street: '1',
        avenue: '4',
        building: '18',
      },
    ],
  },
  {
    id: 'cus-05',
    fullName: 'Dana Al-Fadhli',
    phone: '+96555550105',
    email: 'dana.f@example.com',
    preferredLocale: 'ar',
    membership: 'classic',
    joinedDaysAgo: 95,
    addresses: [
      {
        id: 'adr-05',
        label: 'home',
        propertyType: 'apartment',
        areaId: 'jabriya',
        block: '1A',
        street: '5',
        building: '12',
        floor: '3',
        apartment: '7',
      },
    ],
  },
  {
    id: 'cus-06',
    fullName: 'James Whitaker',
    phone: '+96555550106',
    email: 'j.whitaker@example.com',
    preferredLocale: 'en',
    membership: 'classic',
    joinedDaysAgo: 120,
    addresses: [
      {
        id: 'adr-06',
        label: 'home',
        propertyType: 'apartment',
        areaId: 'sharq',
        block: '5',
        street: 'Ahmad Al-Jaber St',
        building: '8',
        floor: '14',
        apartment: '1402',
      },
    ],
  },
  {
    id: 'cus-07',
    fullName: 'Hamad Al-Shammari',
    phone: '+96555550107',
    preferredLocale: 'ar',
    membership: 'gold',
    joinedDaysAgo: 260,
    addresses: [
      {
        id: 'adr-07',
        label: 'home',
        propertyType: 'villa',
        areaId: 'saad-al-abdullah',
        block: '7',
        street: '715',
        building: '22',
      },
    ],
  },
  {
    id: 'cus-08',
    fullName: 'Maryam Hussain',
    phone: '+96555550108',
    preferredLocale: 'ar',
    membership: 'classic',
    joinedDaysAgo: 70,
    addresses: [
      {
        id: 'adr-08',
        label: 'home',
        propertyType: 'apartment',
        areaId: 'fintas',
        block: '2',
        street: '20',
        building: '41',
        floor: '2',
        apartment: '4',
      },
    ],
  },
  {
    id: 'cus-09',
    fullName: 'Layla Haddad',
    phone: '+96555550109',
    email: 'layla.h@example.com',
    preferredLocale: 'en',
    membership: 'gold',
    joinedDaysAgo: 230,
    addresses: [
      {
        id: 'adr-09',
        label: 'home',
        propertyType: 'villa',
        areaId: 'adailiya',
        block: '3',
        street: '34',
        avenue: '2',
        building: '5',
      },
    ],
  },
  {
    id: 'cus-10',
    fullName: 'Ali Behbehani',
    phone: '+96555550110',
    preferredLocale: 'ar',
    membership: 'platinum',
    joinedDaysAgo: 340,
    addresses: [
      {
        id: 'adr-10',
        label: 'home',
        propertyType: 'villa',
        areaId: 'qurain',
        block: '4',
        street: '9',
        building: '30',
      },
    ],
  },
  {
    id: 'cus-11',
    fullName: 'Reem Al-Mutawa',
    phone: '+96555550111',
    preferredLocale: 'ar',
    membership: 'classic',
    joinedDaysAgo: 45,
    addresses: [
      {
        id: 'adr-11',
        label: 'home',
        propertyType: 'house',
        areaId: 'khaitan',
        block: '8',
        street: '2',
        building: '16',
      },
    ],
  },
  {
    id: 'cus-12',
    fullName: 'Yaqoub Al-Hajri',
    phone: '+96555550112',
    preferredLocale: 'ar',
    membership: 'classic',
    joinedDaysAgo: 150,
    addresses: [
      {
        id: 'adr-12',
        label: 'home',
        propertyType: 'villa',
        areaId: 'mangaf',
        block: '4',
        street: '18',
        building: '11',
      },
    ],
  },
  {
    id: 'cus-13',
    fullName: 'Ana Fernandes',
    phone: '+96555550113',
    email: 'ana.f@example.com',
    preferredLocale: 'en',
    membership: 'classic',
    joinedDaysAgo: 60,
    addresses: [
      {
        id: 'adr-13',
        label: 'home',
        propertyType: 'apartment',
        areaId: 'mahboula',
        block: '1',
        street: '104',
        building: '7',
        floor: '9',
        apartment: '91',
      },
    ],
  },
  {
    id: 'cus-14',
    fullName: 'Bader Al-Enezi',
    phone: '+96555550114',
    preferredLocale: 'ar',
    membership: 'classic',
    joinedDaysAgo: 30,
    status: 'blocked',
    addresses: [
      {
        id: 'adr-14',
        label: 'home',
        propertyType: 'house',
        areaId: 'jahra',
        block: '2',
        street: '6',
        building: '40',
      },
    ],
  },
];

export const adminSeeds = [
  {
    id: 'adm-01',
    fullName: 'Dalal Al-Rashed',
    email: 'admin@myhome.demo',
    role: 'super_admin' as const,
    /** Demo credential only — validated by the mock, never by a real server. */
    password: 'Demo@2026',
  },
  {
    id: 'adm-02',
    fullName: 'Fahad Al-Sayer',
    email: 'ops@myhome.demo',
    role: 'operations' as const,
    password: 'Demo@2026',
  },
];

export const DEMO_ACCOUNTS = {
  customerPhone: '+96555550101',
  technicianPhone: '+96560001001',
  adminEmail: 'admin@myhome.demo',
  adminPassword: 'Demo@2026',
} as const;
