/**
 * The single next action a professional can take on a job, derived from the
 * shared lifecycle (`nextTechnicianStatus`). The API enforces the same rules;
 * this only decides what the screen offers.
 */
import {
  type Booking,
  kuwaitDateOf,
  type LocalDate,
  nextTechnicianStatus,
  type TechnicianStep,
} from '@myhome/shared';
import type { TKey } from '@/i18n/translate';

export type JobAction =
  | { kind: 'offer' }
  | {
      kind: 'advance';
      next: TechnicianStep;
      label: TKey;
      /** Travel can only start on the scheduled day: the day it becomes possible. */
      blockedUntil?: LocalDate;
    }
  | { kind: 'none' };

const LABEL: Record<TechnicianStep, TKey> = {
  on_the_way: 'job.startTravel',
  arrived: 'job.arrived',
  in_progress: 'job.startWork',
  completed: 'job.complete',
};

export function nextJobAction(
  job: Pick<Booking, 'status' | 'scheduledStart'>,
  today: LocalDate,
): JobAction {
  if (job.status === 'pending') return { kind: 'offer' };
  const next = nextTechnicianStatus(job.status);
  if (!next) return { kind: 'none' };
  const day = kuwaitDateOf(job.scheduledStart);
  return {
    kind: 'advance',
    next,
    label: LABEL[next],
    ...(next === 'on_the_way' && day > today ? { blockedUntil: day } : {}),
  };
}
