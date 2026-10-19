/**
 * Kuwait reference geography: the six governorates and a curated set of
 * residential areas with Arabic names. Coordinates are approximate area
 * centres, used only for map previews and simulated tracking.
 */
import type { Area, Governorate, GovernorateId } from '../types/geo';

export const governorates: Governorate[] = [
  { id: 'capital', name: { en: 'Capital', ar: 'العاصمة' } },
  { id: 'hawalli', name: { en: 'Hawalli', ar: 'حولي' } },
  { id: 'farwaniya', name: { en: 'Farwaniya', ar: 'الفروانية' } },
  { id: 'mubarak-al-kabeer', name: { en: 'Mubarak Al-Kabeer', ar: 'مبارك الكبير' } },
  { id: 'ahmadi', name: { en: 'Ahmadi', ar: 'الأحمدي' } },
  { id: 'jahra', name: { en: 'Jahra', ar: 'الجهراء' } },
];

type AreaRow = [id: string, en: string, ar: string, lat: number, lng: number];

const rows: Record<GovernorateId, AreaRow[]> = {
  capital: [
    ['kuwait-city', 'Kuwait City', 'مدينة الكويت', 29.3759, 47.9774],
    ['sharq', 'Sharq', 'شرق', 29.3842, 47.9925],
    ['dasman', 'Dasman', 'دسمان', 29.3897, 48.0003],
    ['bneid-al-qar', 'Bneid Al-Qar', 'بنيد القار', 29.3707, 48.0034],
    ['dasma', 'Dasma', 'الدسمة', 29.3638, 48.0072],
    ['daiya', 'Daiya', 'الدعية', 29.3609, 48.0158],
    ['shuwaikh', 'Shuwaikh', 'الشويخ', 29.3524, 47.9389],
    ['shamiya', 'Shamiya', 'الشامية', 29.3474, 47.9634],
    ['kaifan', 'Kaifan', 'كيفان', 29.3383, 47.9569],
    ['abdullah-al-salem', 'Abdullah Al-Salem', 'ضاحية عبدالله السالم', 29.3533, 47.9813],
    ['mansouriya', 'Mansouriya', 'المنصورية', 29.3577, 47.9932],
    ['qadsiya', 'Qadsiya', 'القادسية', 29.3478, 48.0035],
    ['faiha', 'Faiha', 'الفيحاء', 29.3389, 47.9801],
    ['nuzha', 'Nuzha', 'النزهة', 29.3404, 47.9946],
    ['rawda', 'Rawda', 'الروضة', 29.3293, 47.9939],
    ['adailiya', 'Adailiya', 'العديلية', 29.3278, 47.9834],
    ['khaldiya', 'Khaldiya', 'الخالدية', 29.3225, 47.9658],
    ['yarmouk', 'Yarmouk', 'اليرموك', 29.3108, 47.9694],
    ['qortuba', 'Qortuba', 'قرطبة', 29.3061, 47.9858],
    ['surra', 'Surra', 'السرة', 29.3125, 48.0003],
  ],
  hawalli: [
    ['hawalli', 'Hawalli', 'حولي', 29.3328, 48.0286],
    ['shaab', 'Shaab', 'الشعب', 29.3497, 48.0329],
    ['salmiya', 'Salmiya', 'السالمية', 29.3339, 48.0761],
    ['jabriya', 'Jabriya', 'الجابرية', 29.3186, 48.0294],
    ['rumaithiya', 'Rumaithiya', 'الرميثية', 29.3108, 48.0753],
    ['salwa', 'Salwa', 'سلوى', 29.2958, 48.0786],
    ['bayan', 'Bayan', 'بيان', 29.3031, 48.0483],
    ['mishref', 'Mishref', 'مشرف', 29.2769, 48.0619],
    ['siddiq', 'Siddiq', 'الصديق', 29.2911, 48.0108],
    ['salam', 'Salam', 'السلام', 29.2936, 48.0003],
    ['hitteen', 'Hitteen', 'حطين', 29.2828, 48.0283],
    ['shuhada', 'Shuhada', 'الشهداء', 29.2744, 48.0228],
    ['zahra', 'Zahra', 'الزهراء', 29.2783, 47.9967],
  ],
  farwaniya: [
    ['farwaniya', 'Farwaniya', 'الفروانية', 29.2775, 47.9586],
    ['khaitan', 'Khaitan', 'خيطان', 29.2847, 47.9761],
    ['omariya', 'Omariya', 'العمرية', 29.2925, 47.9417],
    ['ishbiliya', 'Ishbiliya', 'إشبيلية', 29.2733, 47.9375],
    ['rabiya', 'Rabiya', 'الرابية', 29.2953, 47.9289],
    ['ardiya', 'Ardiya', 'العارضية', 29.2894, 47.9061],
    ['andalous', 'Andalous', 'الأندلس', 29.3022, 47.8858],
    ['rehab', 'Rehab', 'الرحاب', 29.2833, 47.9311],
    ['jleeb-al-shuyoukh', 'Jleeb Al-Shuyoukh', 'جليب الشيوخ', 29.2669, 47.9306],
    ['abdullah-al-mubarak', 'Abdullah Al-Mubarak', 'عبدالله المبارك', 29.2547, 47.8986],
  ],
  'mubarak-al-kabeer': [
    ['mubarak-al-kabeer', 'Mubarak Al-Kabeer', 'مبارك الكبير', 29.1914, 48.0606],
    ['qurain', 'Qurain', 'القرين', 29.2033, 48.0733],
    ['adan', 'Adan', 'العدان', 29.2222, 48.0814],
    ['qusour', 'Qusour', 'القصور', 29.2128, 48.0836],
    ['sabah-al-salem', 'Sabah Al-Salem', 'صباح السالم', 29.2547, 48.0811],
    ['messila', 'Messila', 'المسيلة', 29.2442, 48.1042],
    ['abu-fatira', 'Abu Fatira', 'أبو فطيرة', 29.2025, 48.1006],
    ['fnaitees', 'Fnaitees', 'الفنيطيس', 29.2214, 48.1017],
  ],
  ahmadi: [
    ['ahmadi', 'Ahmadi', 'الأحمدي', 29.0769, 48.0839],
    ['fintas', 'Fintas', 'الفنطاس', 29.1736, 48.1214],
    ['egaila', 'Egaila', 'العقيلة', 29.1717, 48.1011],
    ['mahboula', 'Mahboula', 'المهبولة', 29.1497, 48.1236],
    ['abu-halifa', 'Abu Halifa', 'أبو حليفة', 29.1269, 48.1225],
    ['mangaf', 'Mangaf', 'المنقف', 29.1017, 48.1308],
    ['fahaheel', 'Fahaheel', 'الفحيحيل', 29.0825, 48.1303],
    ['riqqa', 'Riqqa', 'الرقة', 29.1414, 48.0967],
    ['sabahiya', 'Sabahiya', 'الصباحية', 29.1131, 48.1072],
    ['sabah-al-ahmad', 'Sabah Al-Ahmad City', 'مدينة صباح الأحمد', 28.7911, 48.0242],
  ],
  jahra: [
    ['jahra', 'Jahra', 'الجهراء', 29.3375, 47.6581],
    ['qasr', 'Qasr', 'القصر', 29.3483, 47.6731],
    ['oyoun', 'Oyoun', 'العيون', 29.3381, 47.7036],
    ['naseem', 'Naseem', 'النسيم', 29.3289, 47.7194],
    ['waha', 'Waha', 'الواحة', 29.3528, 47.6861],
    ['saad-al-abdullah', 'Saad Al-Abdullah', 'سعد العبدالله', 29.3194, 47.6947],
  ],
};

export const areas: Area[] = (Object.keys(rows) as GovernorateId[]).flatMap((governorateId) =>
  rows[governorateId].map(([id, en, ar, lat, lng]) => ({
    id,
    governorateId,
    name: { en, ar },
    center: { lat, lng },
  })),
);

const areaById = new Map(areas.map((a) => [a.id, a]));
const governorateById = new Map(governorates.map((g) => [g.id, g]));

export function getArea(areaId: string): Area | undefined {
  return areaById.get(areaId);
}

export function getGovernorate(id: GovernorateId): Governorate | undefined {
  return governorateById.get(id);
}

export function areasInGovernorate(id: GovernorateId): Area[] {
  return areas.filter((a) => a.governorateId === id);
}
