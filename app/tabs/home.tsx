import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/src/providers/app-theme-provider';

const HomeScreen = () => {
  const { mode, scheme, colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>FlowTine</Text>
      <Text style={[styles.subtitle, { color: colors.mutedText }]}>Local app template</Text>

      <Text style={[styles.row, { color: colors.mutedText }]}>
        Theme mode: <Text style={{ color: colors.text }}>{mode}</Text>
      </Text>
      <Text style={[styles.row, { color: colors.mutedText }]}>
        Effective scheme: <Text style={{ color: colors.text }}>{scheme}</Text>
      </Text>

      <Text style={[styles.hint, { color: colors.mutedText }]}>
        Colors come from <Text style={{ color: colors.text }}>`src/state/colors.ts`</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, marginBottom: 10 },
  row: { marginTop: 6 },
  hint: { marginTop: 14 },
});

export default HomeScreen;