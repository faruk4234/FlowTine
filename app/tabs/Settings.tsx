import { Text, View } from 'react-native';

import { useAppTheme } from '@/src/providers/app-theme-provider';

export default function SettingsScreen() {
  const { colors } = useAppTheme();

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: colors.background,justifyContent: 'center',alignItems: 'center' }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>Settings</Text>
      <Text style={{ color: colors.mutedText, marginTop: 12 }}>
        Add your settings UI here (theme toggle, local prefs, etc).
      </Text>
    </View>
  );
}

