import { StyleSheet } from 'react-native';

import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { storage } from '@/src/storage/storage';

export default function TabTwoScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Explore</ThemedText>
      <ThemedText>
        AsyncStorage helpers are in <ThemedText type="defaultSemiBold">storage/storage.ts</ThemedText>.
      </ThemedText>

      <ThemedText
        type="link"
        onPress={() => {
          storage.setJSON('example.counter', { value: Date.now() });
        }}>
        Tap to write a test key
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
});
