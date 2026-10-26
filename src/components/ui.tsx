import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const c = useTheme();
  const inner = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: c.background }}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { flex: 1 }]}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const c = useTheme();
  const bg = { primary: c.accent, secondary: c.backgroundElement, danger: c.danger, ghost: 'transparent' }[variant];
  const fg = { primary: c.accentText, secondary: c.text, danger: '#fff', ghost: c.accent }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: Spacing.one }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={c.textSecondary}
        style={[
          styles.input,
          { color: c.text, backgroundColor: c.backgroundElement, borderColor: c.border },
          props.multiline && { minHeight: 140, textAlignVertical: 'top' },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const c = useTheme();
  return <Text style={[styles.label, { color: c.textSecondary }]}>{children}</Text>;
}

export function Title({ children }: { children: ReactNode }) {
  const c = useTheme();
  return <Text style={[styles.title, { color: c.text }]}>{children}</Text>;
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const c = useTheme();
  return <Text style={[styles.body, { color: muted ? c.textSecondary : c.text }]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.backgroundElement, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? c.accent : c.border, backgroundColor: selected ? c.accentSoft : 'transparent' },
      ]}>
      <Text style={{ color: selected ? c.accent : c.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const c = useTheme();
  if (!children) return null;
  return <Text style={{ color: c.danger }}>{children}</Text>;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.four, alignItems: 'center' },
  content: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: Spacing.four, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: 12, fontSize: 16 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
});
