import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, ErrorText, Field, Label, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { parseExamDate } from '@/lib/cards';
import { supabase } from '@/lib/supabase';
import { LEVEL_LABELS, type StudyLevel } from '@/lib/types';

export default function NewDeck() {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState<StudyLevel>('university');
  const [examDate, setExamDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function create() {
    setError('');
    if (!title.trim()) return setError('Give your deck a name.');
    if (examDate && !parseExamDate(examDate)) return setError('Use the format YYYY-MM-DD for the exam date.');
    setBusy(true);
    const { data, error } = await supabase
      .from('decks')
      .insert({ title: title.trim(), subject: subject.trim() || null, level, exam_date: examDate || null })
      .select('id')
      .single();
    setBusy(false);
    if (error) return setError(error.message);
    router.replace(`/deck/${data.id}/add`);
  }

  return (
    <Screen>
      <Field label="Deck name" value={title} onChangeText={setTitle} placeholder="e.g. Cell biology, Tax law" />
      <Field label="Subject (optional)" value={subject} onChangeText={setSubject} placeholder="e.g. Life Sciences" />

      <View style={{ gap: Spacing.two }}>
        <Label>Level</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {(Object.keys(LEVEL_LABELS) as StudyLevel[]).map((l) => (
            <Chip key={l} label={LEVEL_LABELS[l]} selected={level === l} onPress={() => setLevel(l)} />
          ))}
        </View>
      </View>

      <Field
        label="Exam date (optional)"
        value={examDate}
        onChangeText={setExamDate}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />

      <ErrorText>{error}</ErrorText>
      <Button title="Create deck" onPress={create} loading={busy} />
    </Screen>
  );
}
