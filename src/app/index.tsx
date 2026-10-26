import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Button, Card, ErrorText, Label, Title } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseExamDate } from '@/lib/cards';
import { supabase } from '@/lib/supabase';
import { LEVEL_LABELS, type DeckStats } from '@/lib/types';

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function Home() {
  const c = useTheme();
  const [decks, setDecks] = useState<DeckStats[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('deck_stats').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else {
      setError('');
      setDecks(data as DeckStats[]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalDue = decks?.reduce((sum, d) => sum + d.due_count, 0) ?? 0;

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => supabase.auth.signOut()} hitSlop={12}>
              <Text style={{ color: c.accent, fontWeight: '600' }}>Sign out</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: Spacing.three, alignItems: 'center' }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }>
        <View style={{ width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three }}>
          <View style={{ gap: Spacing.one }}>
            <Title>Your decks</Title>
            <Body muted>
              {totalDue > 0 ? `${totalDue} card${totalDue === 1 ? '' : 's'} due for review today.` : 'Nothing due right now.'}
            </Body>
          </View>

          <Button title="+ New deck" onPress={() => router.push('/deck/new')} />
          <ErrorText>{error}</ErrorText>

          {decks === null && !error && <ActivityIndicator />}

          {decks?.length === 0 && (
            <Card>
              <Body>No decks yet.</Body>
              <Body muted>Create a deck for a subject, then paste notes or upload a PDF or photo to generate flashcards.</Body>
            </Card>
          )}

          {decks?.map((deck) => {
            const exam = parseExamDate(deck.exam_date);
            const days = exam ? daysUntil(exam) : null;
            return (
              <Pressable key={deck.id} onPress={() => router.push(`/deck/${deck.id}`)}>
                {({ pressed }) => (
                  <Card style={{ opacity: pressed ? 0.8 : 1 }}>
                    <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{deck.title}</Text>
                    <Label>
                      {[deck.subject, LEVEL_LABELS[deck.level]].filter(Boolean).join(' · ')}
                    </Label>
                    <View style={{ flexDirection: 'row', gap: Spacing.three, flexWrap: 'wrap' }}>
                      <Stat label="due" value={deck.due_count} color={deck.due_count ? c.accent : c.textSecondary} />
                      <Stat label="new" value={deck.new_count} color={c.textSecondary} />
                      <Stat label="cards" value={deck.card_count} color={c.textSecondary} />
                      {days !== null && (
                        <Text style={{ color: days <= 7 ? c.danger : c.textSecondary }}>
                          {days > 0 ? `Exam in ${days} day${days === 1 ? '' : 's'}` : days === 0 ? 'Exam today' : 'Exam passed'}
                        </Text>
                      )}
                    </View>
                  </Card>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Text style={{ color }}>
      <Text style={{ fontWeight: '700' }}>{value}</Text> {label}
    </Text>
  );
}
