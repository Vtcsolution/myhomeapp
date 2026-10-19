/** Professional app helpers (stage 6): job actions, schedule, attention, availability, amounts. */
import { type Booking, parseKwdToFils, type TechnicianAvailability } from '@myhome/shared';
import { createSeedState } from '@myhome/shared/mock';
import { describe, expect, it } from 'vitest';
import { attentionItems } from './attention';
import { addDayOff, invalidDays, removeDayOff, stepTime, toggleDay } from './availabilityForm';
import { nextJobAction } from './jobActions';
import { dayAgenda, jobsPerDay } from './proSchedule';

const NOW = Date.parse('2026-10-19T07:30:00.000Z'); // Monday 10:30 Kuwait
const seed = createSeedState({ now: NOW });
const base = seed.bookings[0]!;

function job(overrides: Partial<Booking>): Booking {
  return {
    ...base,
    id: overrides.id ?? `job-${Math.random().toString(36).slice(2)}`,
    extraCharges: [],
    status: 'confirmed',
    ...overrides,
  };
}

const at = (localDate: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(
    Date.parse(`${localDate}T00:00:00.000Z`) + ((h! - 3) * 60 + m!) * 60_000,
  ).toISOString();
};

const WEEK: TechnicianAvailability = {
  weekly: {
    0: { start: '08:00', end: '22:00' },
    1: { start: '09:00', end: '17:00' },
    2: { start: '08:00', end: '22:00' },
    3: { start: '08:00', end: '22:00' },
    4: { start: '08:00', end: '22:00' },
    5: null,
    6: { start: '08:00', end: '22:00' },
  },
  daysOff: ['2026-10-21'],
};

describe('next job action follows the shared lifecycle', () => {
  it('offers accept/decline for requests and the next step for accepted jobs', () => {
    expect(
      nextJobAction({ status: 'pending', scheduledStart: at('2026-10-19', '12:00') }, '2026-10-19'),
    ).toEqual({ kind: 'offer' });
    const steps = (['confirmed', 'on_the_way', 'arrived', 'in_progress'] as const).map((status) => {
      const action = nextJobAction(
        { status, scheduledStart: at('2026-10-19', '12:00') },
        '2026-10-19',
      );
      return action.kind === 'advance' ? action.next : action.kind;
    });
    expect(steps).toEqual(['on_the_way', 'arrived', 'in_progress', 'completed']);
    expect(
      nextJobAction(
        { status: 'completed', scheduledStart: at('2026-10-19', '12:00') },
        '2026-10-19',
      ).kind,
    ).toBe('none');
    expect(
      nextJobAction(
        { status: 'cancelled', scheduledStart: at('2026-10-19', '12:00') },
        '2026-10-19',
      ).kind,
    ).toBe('none');
  });

  it('blocks travel before the scheduled day', () => {
    const action = nextJobAction(
      { status: 'confirmed', scheduledStart: at('2026-10-22', '10:00') },
      '2026-10-19',
    );
    expect(action).toMatchObject({
      kind: 'advance',
      next: 'on_the_way',
      blockedUntil: '2026-10-22',
    });
  });
});

describe('day agenda', () => {
  const jobs = [
    job({
      id: 'a',
      scheduledStart: at('2026-10-19', '14:00'),
      scheduledEnd: at('2026-10-19', '16:00'),
    }),
    job({
      id: 'b',
      scheduledStart: at('2026-10-19', '10:00'),
      scheduledEnd: at('2026-10-19', '12:00'),
      status: 'in_progress',
    }),
    job({
      id: 'c',
      scheduledStart: at('2026-10-19', '18:00'),
      scheduledEnd: at('2026-10-19', '20:00'),
      status: 'cancelled',
    }),
    job({
      id: 'd',
      scheduledStart: at('2026-10-20', '10:00'),
      scheduledEnd: at('2026-10-20', '12:00'),
    }),
  ].map((j) => ({ ...j, price: { ...j.price, estimatedDurationMin: 90 } }));

  it('lists the day’s jobs in order without cancelled ones', () => {
    const agenda = dayAgenda('2026-10-19', { availability: WEEK }, jobs, NOW);
    expect(agenda.jobs.map((j) => j.id)).toEqual(['b', 'a']);
    expect(agenda.hours).toEqual({ start: '09:00', end: '17:00' });
  });

  it('marks windows booked, open, unavailable or past using the shared rules', () => {
    const agenda = dayAgenda('2026-10-19', { availability: WEEK }, jobs, NOW);
    const state = (hhmm: string) =>
      agenda.windows.find((w) => w.start === at('2026-10-19', hhmm))?.state;
    expect(state('08:00')).toBe('past');
    expect(state('10:00')).toBe('booked');
    expect(state('12:00')).toBe('free');
    expect(state('14:00')).toBe('booked');
    expect(state('16:00')).toBe('outside'); // ends after working hours (17:00 limit)
    expect(state('18:00')).toBe('outside'); // cancelled job frees nothing outside hours
    expect(agenda.windows.find((w) => w.state === 'booked')?.jobId).toBe('b');
  });

  it('treats days off and non-working weekdays as unavailable', () => {
    const dayOff = dayAgenda('2026-10-21', { availability: WEEK }, jobs, NOW);
    expect(dayOff.dayOff).toBe(true);
    expect(dayOff.windows.every((w) => w.state === 'outside')).toBe(true);
    const friday = dayAgenda('2026-10-23', { availability: WEEK }, jobs, NOW);
    expect(friday.hours).toBeNull();
    expect(friday.windows[0]?.start).toBe(at('2026-10-23', '14:00')); // Friday opens at 14:00
  });

  it('counts jobs per day for the date strip', () => {
    const counts = jobsPerDay(jobs);
    expect(counts.get('2026-10-19')).toBe(2);
    expect(counts.get('2026-10-20')).toBe(1);
  });
});

describe('attention list', () => {
  it('puts extra-charge approvals first, then live jobs, then visits starting soon', () => {
    const items = attentionItems(
      [
        job({ id: 'soon', scheduledStart: new Date(NOW + 2 * 3_600_000).toISOString() }),
        job({ id: 'later', scheduledStart: new Date(NOW + 6 * 3_600_000).toISOString() }),
        job({ id: 'live', status: 'on_the_way' }),
        job({
          id: 'extra',
          status: 'in_progress',
          extraCharges: [
            {
              id: 'x',
              description: 'Valve',
              amount: 2_000,
              status: 'pending_approval',
              createdAt: new Date(NOW).toISOString(),
            },
          ],
        }),
      ],
      NOW,
    );
    expect(items.map((i) => [i.job.id, i.reason])).toEqual([
      ['extra', 'extra'],
      ['live', 'live'],
      ['soon', 'soon'],
    ]);
  });
});

describe('availability form', () => {
  it('turns a day on with that weekday’s business hours (Friday from 14:00)', () => {
    const friday = toggleDay(WEEK, 5, true).weekly[5];
    expect(friday).toEqual({ start: '14:00', end: '22:00' });
    expect(toggleDay(WEEK, 1, false).weekly[1]).toBeNull();
  });

  it('steps times by 30 minutes within business hours and keeps start before end', () => {
    const earlier = stepTime(WEEK, 1, 'start', -4).weekly[1];
    expect(earlier?.start).toBe('08:00'); // clamped to opening time
    const later = stepTime(WEEK, 1, 'end', 20).weekly[1];
    expect(later?.end).toBe('22:00'); // clamped to closing time
    const squeezed = stepTime(WEEK, 1, 'start', 40).weekly[1];
    expect(squeezed?.start).toBe('16:30'); // one step before the end
    expect(invalidDays(WEEK)).toEqual([]);
    expect(
      invalidDays({ ...WEEK, weekly: { ...WEEK.weekly, 2: { start: '18:00', end: '09:00' } } }),
    ).toEqual([2]);
  });

  it('adds and removes days off without duplicates', () => {
    const added = addDayOff(addDayOff(WEEK, '2026-10-25'), '2026-10-25');
    expect(added.daysOff).toEqual(['2026-10-21', '2026-10-25']);
    expect(removeDayOff(added, '2026-10-21').daysOff).toEqual(['2026-10-25']);
  });
});

describe('KWD amounts', () => {
  it('parses dinars with up to three decimals into fils', () => {
    expect(parseKwdToFils('4.5')).toBe(4_500);
    expect(parseKwdToFils('12,000.250')).toBe(12_000_250);
    expect(parseKwdToFils('0.500')).toBe(500);
    expect(parseKwdToFils('٤٫٥')).toBe(4_500);
    expect(parseKwdToFils('1.2345')).toBeNull();
    expect(parseKwdToFils('abc')).toBeNull();
    expect(parseKwdToFils('')).toBeNull();
  });
});
