import { describe, expect, it } from 'vitest';

import { MIN_EASE, newSchedule, previewIntervals, readiness, review } from './srs';

const now = new Date('2026-01-01T09:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

describe('review', () => {
  it('schedules a new card 1 day out on "good"', () => {
    const next = review(newSchedule(now), 'good', { now });
    expect(next.intervalDays).toBe(1);
    expect(next.repetitions).toBe(1);
    expect(next.dueAt.getTime()).toBe(now.getTime() + DAY);
  });

  it('grows intervals with repeated "good" ratings', () => {
    let card = newSchedule(now);
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      card = review(card, 'good', { now });
      intervals.push(card.intervalDays);
    }
    expect(intervals).toEqual([1, 6, 15, 38]);
  });

  it('resets on "again" and brings the card back within the session', () => {
    let card = review(review(newSchedule(now), 'good', { now }), 'good', { now });
    card = review(card, 'again', { now });
    expect(card.repetitions).toBe(0);
    expect(card.intervalDays).toBe(0);
    expect(card.lapses).toBe(1);
    expect(card.dueAt.getTime() - now.getTime()).toBe(10 * 60 * 1000);
  });

  it('never lets ease drop below the minimum', () => {
    let card = newSchedule(now);
    for (let i = 0; i < 20; i++) card = review(card, 'again', { now });
    expect(card.ease).toBe(MIN_EASE);
  });

  it('orders preview intervals sensibly', () => {
    const card = review(review(newSchedule(now), 'good', { now }), 'good', { now });
    const p = previewIntervals(card, { now });
    expect(p.again).toBe(0);
    expect(p.hard).toBeLessThan(p.good);
    expect(p.good).toBeLessThan(p.easy);
  });
});

describe('exam pacing', () => {
  it('keeps the next review well before the exam', () => {
    let card = newSchedule(now);
    for (let i = 0; i < 5; i++) card = review(card, 'easy', { now });
    const examDate = new Date(now.getTime() + 10 * DAY);
    const next = review(card, 'easy', { now, examDate });
    expect(next.intervalDays).toBe(5);
    expect(next.dueAt < examDate).toBe(true);
  });

  it('reviews daily in the last day before the exam', () => {
    const card = review(newSchedule(now), 'easy', { now });
    const examDate = new Date(now.getTime() + 0.5 * DAY);
    expect(review(card, 'easy', { now, examDate }).intervalDays).toBe(1);
  });
});

describe('readiness', () => {
  it('counts learned, not-overdue cards', () => {
    const learned = review(review(newSchedule(now), 'good', { now }), 'good', { now });
    expect(readiness([learned, newSchedule(now)], now)).toBe(0.5);
    expect(readiness([], now)).toBe(0);
  });
});
