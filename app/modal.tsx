import { Text, View } from 'react-native';

import { useAppTheme } from '@/src/providers/app-theme-provider';

export default function ModalScreen() {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: colors.background }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Modal</Text>
      <Text style={{ color: colors.mutedText, marginTop: 12 }}>
        Modal screen placeholder.
      </Text>
    </View>
  );
}

