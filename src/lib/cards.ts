import { review, type CardSchedule, type Rating } from './srs';
import { supabase } from './supabase';
import type { Card } from './types';

export function toSchedule(card: Card): CardSchedule {
  return {
    ease: card.ease,
    intervalDays: card.interval_days,
    repetitions: card.repetitions,
    lapses: card.lapses,
    dueAt: new Date(card.due_at),
  };
}

/** Parses a YYYY-MM-DD exam date as the end of that day, local time. */
export function parseExamDate(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59);
}

/** Applies a rating, saves the new schedule and logs the review. */
export async function rateCard(card: Card, rating: Rating, examDate: Date | null): Promise<Card> {
  const next = review(toSchedule(card), rating, { examDate });
  const update = {
    ease: next.ease,
    interval_days: next.intervalDays,
    repetitions: next.repetitions,
    lapses: next.lapses,
    due_at: next.dueAt.toISOString(),
  };
  const { error } = await supabase.from('cards').update(update).eq('id', card.id);
  if (error) throw error;
  await supabase.from('reviews').insert({ card_id: card.id, rating });
  return { ...card, ...update };
}

export interface PickedFile {
  base64: string;
  mediaType: string;
  name: string;
}

export async function generateCards(
  deckId: string,
  input: { text?: string; file?: PickedFile },
  count = 15,
): Promise<Card[]> {
  const { data, error } = await supabase.functions.invoke('generate-cards', {
    body: {
      deckId,
      text: input.text,
      file: input.file ? { base64: input.file.base64, mediaType: input.file.mediaType } : undefined,
      count,
    },
  });
  if (error) {
    // Surface the function's own error message when there is one.
    const context = (error as { context?: Response }).context;
    if (context?.json) {
      const body = await context.json().catch(() => null);
      if (body?.error) throw new Error(body.error);
    }
    throw error;
  }
  return data.cards as Card[];
}

/** Reads a picked file (native URI or web blob URL) as base64. */
export async function readAsBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
