import { StyleSheet } from 'react-native';

import { useAppTheme } from '@/providers/app-theme-provider';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';

export default function HomeScreen() {
  const { mode, scheme } = useAppTheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">FlowTine</ThemedText>
      <ThemedText type="subtitle">Template</ThemedText>
      <ThemedText style={styles.row}>
        Theme mode: <ThemedText type="defaultSemiBold">{mode}</ThemedText>
      </ThemedText>
      <ThemedText style={styles.row}>
        Effective scheme: <ThemedText type="defaultSemiBold">{scheme}</ThemedText>
      </ThemedText>
      <ThemedText style={styles.hint}>
        Colors come from <ThemedText type="defaultSemiBold">constants/colors.ts</ThemedText>.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10 },
  row: { marginTop: 6 },
  hint: { marginTop: 14 },
});
