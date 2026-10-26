import type { Rating } from './srs';

export type StudyLevel = 'high_school' | 'university' | 'professional';

export const LEVEL_LABELS: Record<StudyLevel, string> = {
  high_school: 'High school',
  university: 'University',
  professional: 'Professional exam',
};

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  level: StudyLevel;
  exam_date: string | null;
  created_at: string;
}

export interface DeckStats extends Deck {
  card_count: number;
  due_count: number;
  new_count: number;
}

export interface Card {
  id: string;
  deck_id: string;
  kind: 'basic' | 'mcq';
  front: string;
  back: string;
  distractors: string[];
  source_quote: string | null;
  ease: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
  due_at: string;
  created_at: string;
}

export type { Rating };
