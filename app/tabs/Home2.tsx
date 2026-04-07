import { useAppTheme } from '@/src/providers/app-theme-provider';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const { mode, scheme } = useAppTheme();

  return (
      <View style={styles.container}>
      <Text>FlowTine</Text>
      <Text>Template2112</Text>
      <Text style={styles.row}>
        Theme mode: <Text>{mode}</Text>
      </Text>
      <Text style={styles.row}>
        Effective scheme: <Text>{scheme}</Text>
      </Text>
      <Text style={styles.hint}>
        Colors come from <Text>constants/colors.ts</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10 },
  row: { marginTop: 6 },
  hint: { marginTop: 14 },
});
