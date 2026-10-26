import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Body, Button, Card, Chip, ErrorText, Field, Label, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { generateCards, readAsBase64, type PickedFile } from '@/lib/cards';

const COUNTS = [10, 20, 30];
const MAX_BYTES = 10 * 1024 * 1024;

export default function AddNotes() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [text, setText] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [count, setCount] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pickFile() {
    setError('');
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_BYTES) return setError('Please choose a file under 10 MB.');
    try {
      const base64 = await readAsBase64(asset.uri);
      const mediaType = asset.mimeType ?? (asset.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      setFile({ base64, mediaType, name: asset.name });
    } catch {
      setError('Could not read that file.');
    }
  }

  async function generate() {
    setError('');
    if (!text.trim() && !file) return setError('Paste some notes or choose a file first.');
    setBusy(true);
    try {
      await generateCards(id, { text: text.trim() || undefined, file: file ?? undefined }, count);
      router.replace(`/deck/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Body muted>
        Paste your notes, or upload a PDF, slides exported as PDF, or a photo of handwritten notes. Memora only uses
        what is in your notes, and you can review every card afterwards.
      </Body>

      <Field
        label="Notes"
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Paste notes here…"
      />

      <Card>
        <Label>File</Label>
        {file ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }}>
            <Text style={{ color: c.text, flex: 1 }} numberOfLines={1}>
              {file.name}
            </Text>
            <Button variant="ghost" title="Remove" onPress={() => setFile(null)} />
          </View>
        ) : (
          <Button variant="secondary" title="Choose PDF or photo" onPress={pickFile} />
        )}
      </Card>

      <View style={{ gap: Spacing.two }}>
        <Label>How many cards (up to)</Label>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {COUNTS.map((n) => (
            <Chip key={n} label={String(n)} selected={count === n} onPress={() => setCount(n)} />
          ))}
        </View>
      </View>

      <ErrorText>{error}</ErrorText>
      <Button title={busy ? 'Generating… this can take a minute' : 'Generate flashcards'} onPress={generate} loading={busy} />
    </Screen>
  );
}
