import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Body, Button, Card, ErrorText, Label, Screen, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseExamDate, rateCard, shuffle, toSchedule } from '@/lib/cards';
import { formatInterval, previewIntervals, type Rating } from '@/lib/srs';
import { supabase } from '@/lib/supabase';
import type { Card as CardRow } from '@/lib/types';

const SESSION_SIZE = 30;
const RATINGS: { rating: Rating; label: string }[] = [
  { rating: 'again', label: 'Again' },
  { rating: 'hard', label: 'Hard' },
  { rating: 'good', label: 'Good' },
  { rating: 'easy', label: 'Easy' },
];

export default function Study() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [queue, setQueue] = useState<CardRow[] | null>(null);
  const [examDate, setExamDate] = useState<Date | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [deckRes, dueRes] = await Promise.all([
        supabase.from('decks').select('exam_date').eq('id', id).single(),
        supabase
          .from('cards')
          .select('*')
          .eq('deck_id', id)
          .lte('due_at', new Date().toISOString())
          .order('due_at')
          .limit(SESSION_SIZE),
      ]);
      if (deckRes.error || dueRes.error) return setError((deckRes.error ?? dueRes.error)!.message);
      setExamDate(parseExamDate(deckRes.data.exam_date));
      let cards = dueRes.data as CardRow[];
      // Nothing due: study the cards coming up soonest instead.
      if (cards.length === 0) {
        const ahead = await supabase.from('cards').select('*').eq('deck_id', id).order('due_at').limit(10);
        cards = (ahead.data as CardRow[]) ?? [];
      }
      setQueue(cards);
    })();
  }, [id]);

  const card = queue?.[0];
  const choices = useMemo(
    () => (card?.kind === 'mcq' ? shuffle([card.back, ...card.distractors]) : []),
    [card],
  );
  const previews = card ? previewIntervals(toSchedule(card), { examDate }) : null;

  async function rate(rating: Rating) {
    if (!card || !queue) return;
    setSaving(true);
    setError('');
    try {
      const updated = await rateCard(card, rating, examDate);
      const rest = queue.slice(1);
      // Forgotten cards go back into this session, a few cards later.
      if (rating === 'again') rest.splice(Math.min(3, rest.length), 0, updated);
      setQueue(rest);
      setReviewed((n) => n + 1);
      setRevealed(false);
      setPicked(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your answer.');
    } finally {
      setSaving(false);
    }
  }

  if (error && !queue) return <Screen><ErrorText>{error}</ErrorText></Screen>;
  if (!queue) return <Screen><ActivityIndicator /></Screen>;

  if (!card) {
    return (
      <Screen>
        <View style={{ gap: Spacing.two, marginTop: Spacing.five, alignItems: 'center' }}>
          <Title>Session complete</Title>
          <Body muted>{reviewed ? `You reviewed ${reviewed} card${reviewed === 1 ? '' : 's'}. Nice work.` : 'No cards to study yet.'}</Body>
        </View>
        <Button title="Back to deck" onPress={() => router.back()} />
      </Screen>
    );
  }

  const answeredMcq = card.kind === 'mcq' && picked !== null;
  const showAnswer = revealed || answeredMcq;

  return (
    <Screen>
      <Label>{queue.length} left in this session</Label>

      <Card style={{ minHeight: 160, justifyContent: 'center' }}>
        <Text style={{ color: c.text, fontSize: 20, fontWeight: '600', lineHeight: 28 }}>{card.front}</Text>
      </Card>

      {card.kind === 'mcq' && (
        <View style={{ gap: Spacing.two }}>
          {choices.map((choice) => {
            const isCorrect = choice === card.back;
            const isPicked = choice === picked;
            const border = answeredMcq && isCorrect ? c.success : answeredMcq && isPicked ? c.danger : c.border;
            return (
              <Pressable
                key={choice}
                disabled={answeredMcq}
                onPress={() => setPicked(choice)}
                style={{ borderWidth: 2, borderColor: border, borderRadius: 12, padding: Spacing.three, backgroundColor: c.backgroundElement }}>
                <Text style={{ color: c.text, fontSize: 16 }}>{choice}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {showAnswer ? (
        <>
          {card.kind === 'basic' && (
            <Card style={{ borderColor: c.accent }}>
              <Label>Answer</Label>
              <Text style={{ color: c.text, fontSize: 18, lineHeight: 26 }}>{card.back}</Text>
            </Card>
          )}
          {card.source_quote && (
            <Text style={{ color: c.textSecondary, fontStyle: 'italic' }}>From your notes: “{card.source_quote}”</Text>
          )}
          <Label>How well did you know it?</Label>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            {RATINGS.map(({ rating, label }) => (
              <Pressable
                key={rating}
                disabled={saving}
                onPress={() => rate(rating)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: Spacing.two,
                  borderRadius: 12,
                  backgroundColor: rating === 'again' ? c.danger : rating === 'good' ? c.accent : c.backgroundSelected,
                  opacity: saving ? 0.5 : pressed ? 0.8 : 1,
                })}>
                <Text style={{ color: rating === 'again' ? '#fff' : rating === 'good' ? c.accentText : c.text, fontWeight: '700' }}>
                  {label}
                </Text>
                <Text style={{ color: rating === 'again' ? '#fff' : rating === 'good' ? c.accentText : c.textSecondary, fontSize: 12 }}>
                  {previews && formatInterval(previews[rating])}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        card.kind === 'basic' && <Button title="Show answer" onPress={() => setRevealed(true)} />
      )}

      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
