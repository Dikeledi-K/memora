import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Label, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toSchedule } from '@/lib/cards';
import { readiness } from '@/lib/srs';
import { supabase } from '@/lib/supabase';
import type { Card as CardRow, Deck } from '@/lib/types';

function confirm(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert('Are you sure?', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function DeckScreen() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ front: '', back: '' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [deckRes, cardsRes] = await Promise.all([
      supabase.from('decks').select('*').eq('id', id).single(),
      supabase.from('cards').select('*').eq('deck_id', id).order('created_at'),
    ]);
    if (deckRes.error || cardsRes.error) return setError((deckRes.error ?? cardsRes.error)!.message);
    setDeck(deckRes.data as Deck);
    setCards(cardsRes.data as CardRow[]);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function saveEdit(card: CardRow) {
    const front = draft.front.trim();
    const back = draft.back.trim();
    if (!front || !back) return setError('A card needs both a question and an answer.');
    const { error } = await supabase.from('cards').update({ front, back }).eq('id', card.id);
    if (error) return setError(error.message);
    setCards((prev) => prev?.map((x) => (x.id === card.id ? { ...x, front, back } : x)) ?? null);
    setEditing(null);
  }

  async function deleteCard(card: CardRow) {
    if (!(await confirm('Delete this card?'))) return;
    const { error } = await supabase.from('cards').delete().eq('id', card.id);
    if (error) return setError(error.message);
    setCards((prev) => prev?.filter((x) => x.id !== card.id) ?? null);
  }

  async function deleteDeck() {
    if (!(await confirm(`Delete "${deck?.title}" and all its cards?`))) return;
    const { error } = await supabase.from('decks').delete().eq('id', id);
    if (error) return setError(error.message);
    router.back();
  }

  if (!deck || !cards) {
    return (
      <Screen>
        {error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator />}
      </Screen>
    );
  }

  const now = new Date();
  const due = cards.filter((x) => new Date(x.due_at) <= now).length;
  const ready = Math.round(readiness(cards.map(toSchedule), now) * 100);

  return (
    <Screen>
      <Stack.Screen options={{ title: deck.title }} />

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Label>Due now</Label>
            <Text style={{ color: c.text, fontSize: 28, fontWeight: '700' }}>{due}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Label>Exam readiness</Label>
            <Text style={{ color: c.text, fontSize: 28, fontWeight: '700' }}>{ready}%</Text>
          </View>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: c.backgroundSelected, overflow: 'hidden' }}>
          <View style={{ width: `${ready}%`, height: '100%', backgroundColor: c.success }} />
        </View>
      </Card>

      <Button title={due ? `Study ${due} card${due === 1 ? '' : 's'}` : 'Study ahead'} onPress={() => router.push(`/deck/${id}/study`)} disabled={!cards.length} />
      <Button variant="secondary" title="+ Add notes and generate cards" onPress={() => router.push(`/deck/${id}/add`)} />
      <ErrorText>{error}</ErrorText>

      <Label>{cards.length} cards · tap a card to edit</Label>
      {cards.length === 0 && <Body muted>No cards yet. Add notes to generate some.</Body>}

      {cards.map((card) =>
        editing === card.id ? (
          <Card key={card.id}>
            <Field label="Question" value={draft.front} onChangeText={(front) => setDraft((d) => ({ ...d, front }))} multiline style={{ minHeight: 60 }} />
            <Field label="Answer" value={draft.back} onChangeText={(back) => setDraft((d) => ({ ...d, back }))} multiline style={{ minHeight: 60 }} />
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <Button title="Save" onPress={() => saveEdit(card)} style={{ flex: 1 }} />
              <Button variant="secondary" title="Cancel" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            </View>
          </Card>
        ) : (
          <Pressable
            key={card.id}
            onPress={() => {
              setDraft({ front: card.front, back: card.back });
              setEditing(card.id);
            }}>
            <Card>
              <Text style={{ color: c.text, fontWeight: '600', fontSize: 16 }}>{card.front}</Text>
              <Text style={{ color: c.textSecondary }}>{card.back}</Text>
              {card.kind === 'mcq' && <Label>Multiple choice</Label>}
              {card.source_quote && (
                <Text style={{ color: c.textSecondary, fontStyle: 'italic', fontSize: 13 }} numberOfLines={3}>
                  From your notes: “{card.source_quote}”
                </Text>
              )}
              <View style={{ alignSelf: 'flex-end' }}>
                <Pressable onPress={() => deleteCard(card)} hitSlop={8}>
                  <Text style={{ color: c.danger }}>Delete</Text>
                </Pressable>
              </View>
            </Card>
          </Pressable>
        ),
      )}

      <Button variant="ghost" title="Delete deck" onPress={deleteDeck} />
    </Screen>
  );
}
