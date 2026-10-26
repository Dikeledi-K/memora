/**
 * Spaced-repetition scheduling (SM-2 variant) with optional exam-date pacing.
 *
 * Pure functions with no platform dependencies, so they run the same on
 * Android, iOS, web, and in tests.
 */

/** How well the student recalled a card. */
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface CardSchedule {
  /** Ease factor; starts at 2.5, never below 1.3. */
  ease: number;
  /** Current interval in days (0 means the card is new or relearning). */
  intervalDays: number;
  /** Number of successful reviews in a row. */
  repetitions: number;
  /** Number of times the student has forgotten the card. */
  lapses: number;
  /** When the card is next due. */
  dueAt: Date;
}

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Relearning delay after "again", so the card comes back in the same session. */
const RELEARN_MINUTES = 10;

const QUALITY: Record<Rating, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export function newSchedule(now: Date = new Date()): CardSchedule {
  return { ease: DEFAULT_EASE, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: now };
}

export interface ReviewOptions {
  now?: Date;
  /**
   * Exam date. Intervals are capped so the card is seen again before the
   * exam, and reviews tighten as the date approaches.
   */
  examDate?: Date | null;
}

export function review(
  card: CardSchedule,
  rating: Rating,
  { now = new Date(), examDate = null }: ReviewOptions = {},
): CardSchedule {
  const q = QUALITY[rating];
  // Standard SM-2 ease update.
  const ease = Math.max(MIN_EASE, card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  if (rating === 'again') {
    return {
      ease,
      intervalDays: 0,
      repetitions: 0,
      lapses: card.lapses + 1,
      dueAt: new Date(now.getTime() + RELEARN_MINUTES * 60 * 1000),
    };
  }

  const repetitions = card.repetitions + 1;
  let interval: number;
  if (repetitions === 1) {
    interval = rating === 'easy' ? 3 : 1;
  } else if (repetitions === 2) {
    interval = rating === 'hard' ? 3 : 6;
  } else {
    const multiplier = rating === 'hard' ? 1.2 : rating === 'easy' ? ease * 1.3 : ease;
    interval = card.intervalDays * multiplier;
  }

  interval = capForExam(interval, now, examDate);
  interval = Math.max(1, Math.round(interval));

  return {
    ease,
    intervalDays: interval,
    repetitions,
    lapses: card.lapses,
    dueAt: new Date(now.getTime() + interval * DAY_MS),
  };
}

/**
 * Keeps the next review before the exam. With N days left, a card can wait
 * at most about half of them, so there is time for at least one more
 * review before the exam itself.
 */
function capForExam(interval: number, now: Date, examDate: Date | null): number {
  if (!examDate) return interval;
  const daysLeft = (examDate.getTime() - now.getTime()) / DAY_MS;
  if (daysLeft <= 1) return 1;
  return Math.min(interval, Math.max(1, Math.floor(daysLeft / 2)));
}

/** Next interval (in days) for each rating, for showing on the answer buttons. */
export function previewIntervals(
  card: CardSchedule,
  options: ReviewOptions = {},
): Record<Rating, number> {
  const ratings: Rating[] = ['again', 'hard', 'good', 'easy'];
  return Object.fromEntries(
    ratings.map((r) => [r, review(card, r, options).intervalDays]),
  ) as Record<Rating, number>;
}

export function formatInterval(days: number): string {
  if (days <= 0) return `${RELEARN_MINUTES}m`;
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/** Share of cards that are no longer new and are not currently overdue. */
export function readiness(cards: CardSchedule[], now: Date = new Date()): number {
  if (cards.length === 0) return 0;
  const solid = cards.filter((c) => c.repetitions >= 2 && c.dueAt > now).length;
  return solid / cards.length;
}
